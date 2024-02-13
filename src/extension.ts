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

interface CompletionResponse {
	request_id: String,
	completions: Completion[],
}

let client: LanguageClient;
let ctx: vscode.ExtensionContext;
let loadingIndicator: vscode.StatusBarItem;

function createLoadingIndicator(): vscode.StatusBarItem {
	let li = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10)
	li.text = "$(loading~spin) LLM"
	li.tooltip = "Generating completions..."
	return li
}

export async function activate(context: vscode.ExtensionContext) {
	ctx = context;
	handleConfigTemplateChange(ctx);
	const config = vscode.workspace.getConfiguration("llm");
	// TODO: support TransportKind.socket
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
					"RUST_BACKTRACE": "1",
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		},
		debug: {
			command,
			transport: TransportKind.stdio,
			options: {
				env: {
					"RUST_BACKTRACE": "1",
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		}
	};

	const outputChannel = vscode.window.createOutputChannel('LLM VS Code', { log: true });
	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "*" }],
		outputChannel,
	};
	client = new LanguageClient(
		'llm',
		'LLM VS Code',
		serverOptions,
		clientOptions
	);

	loadingIndicator = createLoadingIndicator()

	await client.start();

	const afterInsert = vscode.commands.registerCommand('llm.afterInsert', async (response: CompletionResponse) => {
		const { request_id, completions } = response;
		const params = {
			requestId: request_id,
			acceptedCompletion: 0,
			shownCompletions: [0],
			completions,
		};
		await client.sendRequest("llm-ls/acceptCompletion", params);
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
			const requestDelay = config.get("requestDelay") as number;
			if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic && !autoSuggest) {
				return;
			}
			if (position.line < 0) {
				return;
			}
			if (requestDelay > 0) {
				const cancelled = await delay(requestDelay, token);
				if (cancelled) {
					return
				}
			}
			let tokenizerConfig: any = config.get("tokenizer");
			if (tokenizerConfig != null && tokenizerConfig.repository != null && tokenizerConfig.api_token == null) {
				tokenizerConfig.api_token = await ctx.secrets.get('apiToken');
			}
			let params = {
				position,
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				model: config.get("modelId") as string,
				backend: config.get("backend") as string,
				url: config.get("url") as string | null,
				tokensToClear: config.get("tokensToClear") as string[],
				apiToken: await ctx.secrets.get('apiToken'),
				requestBody: config.get("requestBody") as object,
				fim: config.get("fillInTheMiddle") as number,
				contextWindow: config.get("contextWindow") as number,
				tlsSkipVerifyInsecure: config.get("tlsSkipVerifyInsecure") as boolean,
				ide: "vscode",
				tokenizerConfig,
			};
			try {
				loadingIndicator.show()
				const response: CompletionResponse = await client.sendRequest("llm-ls/getCompletions", params, token);
				loadingIndicator.hide()

				const items = [];
				for (const completion of response.completions) {
					items.push({
						insertText: completion.generated_text,
						range: new vscode.Range(position, position),
						command: {
							title: 'afterInsert',
							command: 'llm.afterInsert',
							arguments: [response],
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

async function delay(milliseconds: number, token: vscode.CancellationToken): Promise<boolean> {
	/**
	 * Wait for a number of milliseconds, unless the token is cancelled.
	 * It is used to delay the request to the server, so that the user has time to type.
	 *
	 * @param milliseconds number of milliseconds to wait
	 * @param token cancellation token
	 * @returns a promise that resolves with false after N milliseconds, or true if the token is cancelled.
	 *
	 * @remarks This is a workaround for the lack of a debounce function in vscode.
	*/
	return new Promise<boolean>((resolve) => {
		const interval = setInterval(() => {
			if (token.isCancellationRequested) {
				clearInterval(interval);
				resolve(true)
			}
		}, 10); // Check every 10 milliseconds for cancellation

		setTimeout(() => {
			clearInterval(interval);
			resolve(token.isCancellationRequested)
		}, milliseconds);
	});
}