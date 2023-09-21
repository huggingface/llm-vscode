import * as vscode from 'vscode';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';
import { TemplateKey, templates } from './configTemplates';
import { readFile } from 'fs';
import { homedir } from 'os';
import * as path from 'path';


interface Completion {
	generated_text: string;
}

let client: LanguageClient;
let ctx: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	ctx = context;
	handleConfigTemplateChange(ctx);
	const config = vscode.workspace.getConfiguration("llm");
	// TODO: bundle llm-ls with vscode extension
	const binaryPath: string = config.get("lsp.binaryPath") as string;
	const serverOptions: ServerOptions = {
		run: {
			command: binaryPath, transport: TransportKind.stdio, options: {
				env: {
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		},
		debug: {
			command: binaryPath,
			transport: TransportKind.stdio,
			options: {
				env: {
					"LLM_LOG_LEVEL": config.get("lsp.logLevel") as string,
				}
			}
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: "file" }],
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
			vscode.window.showInformationMessage('LLM: Already logged in');
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
			vscode.window.showInformationMessage(`LLM: Logged in from cache: ~/.cache/huggingface/token ${tokenPath}`);
			return;
		}
		const input = await vscode.window.showInputBox({
			prompt: 'Please enter your API token (find yours at hf.co/settings/token):',
			placeHolder: 'Your token goes here ...'
		});
		if (input !== undefined) {
			await ctx.secrets.store('apiToken', input);
			vscode.window.showInformationMessage('LLM: Logged in succesfully');
		}
	});
	ctx.subscriptions.push(login);
	const logout = vscode.commands.registerCommand('llm.logout', async (...args) => {
		await ctx.secrets.delete('apiToken');
		vscode.window.showInformationMessage('LLM: Logged out');
	});
	ctx.subscriptions.push(logout);

	const provider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			if (position.line <= 0) {
				return;
			}

			const config = vscode.workspace.getConfiguration("llm");
			let params = {
				position,
				textDocument: client.code2ProtocolConverter.asTextDocumentIdentifier(document),
				model: config.get("modelIdOrEndpoint") as string,
				tokens_to_clear: config.get("tokensToClear") as string[],
				api_token: (await ctx.secrets.get('apiToken')) ?? "",
				request_params: {
					max_new_tokens: config.get("maxNewTokens") as number,
					temperature: config.get("temperature") as number,
					do_sample: true,
					top_p: 0.95,
				},
				fim: config.get("fillInTheMiddle") as number,
				context_window: config.get("contextWindow") as number,
				tls_skip_verify_insecure: config.get("tlsSkipVerifyInsecure") as boolean,
			};
			const completion: Completion[] = await client.sendRequest("llm-ls/getCompletions", params, token);
			const insertText = completion[0].generated_text;

			const result: vscode.InlineCompletionList = {
				items: [{
					insertText,
					command: {
						title: 'afterInsert',
						command: 'llm-vscode.afterInsert',
						arguments: [{ insertText }],
					}
				}],
			};

			return result;
		},

	};
	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider);
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