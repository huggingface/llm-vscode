import * as vscode from 'vscode';
import {
	DocumentFilter,
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { TemplateKey, templates } from './configTemplates';
import { readFile } from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import { fetch } from 'undici';

interface Completion {
	generated_text: string;
}

let client: LanguageClient;
let ctx: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	ctx = context;
	handleConfigTemplateChange(ctx);
	const config = vscode.workspace.getConfiguration("llm");
	const binaryPath: string | null = config.get("lsp.binaryPath") as string | null;
	let command: string;
	if (binaryPath) {
		command = binaryPath;
	} else {
		const ext = process.platform === "win32" ? ".exe" : "";
		command = vscode.Uri.joinPath(context.extensionUri, "server", `llm-ls${ext}`).fsPath;
	}
	if (command.startsWith("~/")) {
		command = homedir() + command.slice("~".length);
	}
	const serverOptions: ServerOptions = {
		run: {
			command, transport: TransportKind.stdio, options: {
				env: {
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		},
		debug: {
			command,
			transport: TransportKind.stdio,
			options: {
				env: {
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "*" }],
	};
	client = new LanguageClient(
		'llm',
		'LLM VS Code',
		serverOptions,
		clientOptions
	);

	client.start();

	const afterInsert = vscode.commands.registerCommand('llm.afterInsert', async (...args) => {
		// TODO: telemetry
	});
	ctx.subscriptions.push(afterInsert);

	const login = vscode.commands.registerCommand('llm.login', async (...args) => {
		const apiToken = await ctx.secrets.get('apiToken');
		if (apiToken !== undefined) {
			vscode.window.showInformationMessage('Llm: Already logged in');
			return;
		}
		const tokenPath = path.join(homedir(), path.sep, ".cache", path.sep, "huggingface", path.sep, "token");
		const token: string | undefined = await new Promise((res) => {
			readFile(tokenPath, (err, data) => {
				if (err) {
					res(undefined);
				}
				const content = data.toString();
				res(content.trim());
			});
		});
		if (token !== undefined) {
			await ctx.secrets.store('apiToken', token);
			vscode.window.showInformationMessage(`Llm: Logged in from cache: ~/.cache/huggingface/token ${tokenPath}`);
			return;
		}
		const input = await vscode.window.showInputBox({
			prompt: 'Please enter your API token (find yours at hf.co/settings/token):',
			placeHolder: 'Your token goes here ...'
		});
		if (input !== undefined) {
			await ctx.secrets.store('apiToken', input);
			vscode.window.showInformationMessage('Llm: Logged in succesfully');
		}
	});
	ctx.subscriptions.push(login);
	const logout = vscode.commands.registerCommand('llm.logout', async (...args) => {
		await ctx.secrets.delete('apiToken');
		vscode.window.showInformationMessage('Llm: Logged out');
	});
	ctx.subscriptions.push(logout);

	const attribution = vscode.commands.registerTextEditorCommand('llm.attribution', () => {
		void highlightStackAttributions();
	});
	ctx.subscriptions.push(attribution);
	const provider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			const config = vscode.workspace.getConfiguration("llm");
			const autoSuggest = config.get("enableAutoSuggest") as boolean;
			if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic && !autoSuggest) {
				return;
			}
			if (position.line <= 0) {
				return;
			}

			let params = {
				position,
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				model: config.get("modelIdOrEndpoint") as string,
				tokens_to_clear: config.get("tokensToClear") as string[],
				api_token: await ctx.secrets.get('apiToken'),
				request_params: {
					max_new_tokens: config.get("maxNewTokens") as number,
					temperature: config.get("temperature") as number,
					do_sample: true,
					top_p: 0.95,
				},
				fim: config.get("fillInTheMiddle") as number,
				context_window: config.get("contextWindow") as number,
				tls_skip_verify_insecure: config.get("tlsSkipVerifyInsecure") as boolean,
				ide: "vscode",
				tokenizer_config: config.get("tokenizer") as object | null,
			};
			try {
				const completions: Completion[] = await client.sendRequest("llm-ls/getCompletions", params, token);

				const items = [];
				for (const completion of completions as Completion[]) {
					items.push({
						insertText: completion.generated_text,
						range: new vscode.Range(position, position),
						command: {
							title: 'afterInsert',
							command: 'llm-vscode.afterInsert',
							arguments: [{ insertText: completion.generated_text }],
						}
					});
				}

				return {
					items,
				};
			} catch (e) {
				const err_msg = (e as Error).message;
				if (err_msg.includes("is currently loading")) {
					vscode.window.showWarningMessage(err_msg);
				} else if (err_msg !== "Canceled") {
					vscode.window.showErrorMessage(err_msg);
				}
			}

		},

	};
	const documentFilter = config.get("documentFilter") as DocumentFilter | DocumentFilter[];
	vscode.languages.registerInlineCompletionItemProvider(documentFilter, provider);
}

export function deactivate() {
	if (!client) {
		return undefined;
	}
	return client.stop();
}

function handleConfigTemplateChange(context: vscode.ExtensionContext) {
	const listener = vscode.workspace.onDidChangeConfiguration(async event => {
		if (event.affectsConfiguration('llm.configTemplate')) {
			const config = vscode.workspace.getConfiguration("llm");
			const configKey = config.get("configTemplate") as TemplateKey;
			const template = templates[configKey];
			if (template) {
				const updatePromises = Object.entries(template).map(([key, val]) => config.update(key, val, vscode.ConfigurationTarget.Global));
				await Promise.all(updatePromises);
			}
		}
	});
	context.subscriptions.push(listener);
}

// TODO: refactor to select only highlighted code
export default async function highlightStackAttributions(): Promise<void> {
	const document = vscode.window.activeTextEditor?.document
	if (!document) return;

	const config = vscode.workspace.getConfiguration("llm");
	const attributionWindowSize = config.get("attributionWindowSize") as number;
	const attributionEndpoint = config.get("attributionEndpoint") as string;

	// get cursor postion and offset
	const cursorPosition = vscode.window.activeTextEditor?.selection.active;
	if (!cursorPosition) return;
	const cursorOffset = document.offsetAt(cursorPosition);

	const start = Math.max(0, cursorOffset - attributionWindowSize);
	const end = Math.min(document.getText().length, cursorOffset + attributionWindowSize);

	// Select the start to end span
	if (!vscode.window.activeTextEditor) return;
	vscode.window.activeTextEditor.selection = new vscode.Selection(document.positionAt(start), document.positionAt(end));
	// new Range(document.positionAt(start), document.positionAt(end));


	const text = document.getText();
	const textAroundCursor = text.slice(start, end);

	const body = { document: textAroundCursor };

	// notify user request has started
	void vscode.window.showInformationMessage("Searching for nearby code in the stack...");

	const resp = await fetch(attributionEndpoint, {
		method: "POST",
		body: JSON.stringify(body),
		headers: { "Content-Type": "application/json" },
	});

	if (!resp.ok) {
		return;
	}

	const json = await resp.json() as any as { spans: [number, number][] }
	const { spans } = json

	if (spans.length === 0) {
		void vscode.window.showInformationMessage("No code found in the stack");
		return;
	}

	void vscode.window.showInformationMessage("Highlighted code was found in the stack.",
		"Go to stack search"
	).then(clicked => {
		if (clicked) {
			// open stack search url in browser
			void vscode.env.openExternal(vscode.Uri.parse("https://huggingface.co/spaces/bigcode/search"));
		}
	});

	// combine overlapping spans
	const combinedSpans: [number, number][] = spans.reduce((acc, span) => {
		const [s, e] = span;
		if (acc.length === 0) return [[s, e]];
		const [lastStart, lastEnd] = acc[acc.length - 1];
		if (s <= lastEnd) {
			acc[acc.length - 1] = [lastStart, Math.max(lastEnd, e)];
		} else {
			acc.push([s, e]);
		}
		return acc;
	}, [] as [number, number][]);

	const decorations = combinedSpans.map(([startChar, endChar]) => ({ range: new vscode.Range(document.positionAt(startChar + start), document.positionAt(endChar + start)), hoverMessage: "This code might be in the stack!" }))

	// console.log("Highlighting", decorations.map(d => [d.range.start, d.range.end]));

	const decorationType = vscode.window.createTextEditorDecorationType({
		color: 'red',
		textDecoration: 'underline',

	});

	vscode.window.activeTextEditor?.setDecorations(decorationType, decorations);

	setTimeout(() => {
		vscode.window.activeTextEditor?.setDecorations(decorationType, []);
	}, 5000);
}