import { WorkspaceConfiguration, window, workspace } from "vscode";
import * as fs from 'fs'
import { OUTPUT_CHANNEL_NAME } from "./globals/consts";

type Config = WorkspaceConfiguration & {
    logPath: string;
};

const outputChannel = window.createOutputChannel(OUTPUT_CHANNEL_NAME);

export function logInput(txt: string, parameters = {}){
    const config: Config = workspace.getConfiguration("HuggingFaceCode") as Config;
    const { logPath } = config;
    outputChannel.append(`INPUT to API: (with parameters ${JSON.stringify(parameters)}) \n`)
    outputChannel.append(txt);
    outputChannel.append("\n")
    if(logPath){
        fs.appendFileSync(logPath, JSON.stringify({time: Date.now(), type:"input", text: txt, parameters}) + "\n")
    }
}

export function logOutput(txt: string){
    const config: Config = workspace.getConfiguration("HuggingFaceCode") as Config;
    const { logPath } = config;
    outputChannel.append("OUTPUT from API:\n")
    outputChannel.append(txt);
    outputChannel.append("\n\n");

    if(logPath){
        fs.appendFileSync(logPath, JSON.stringify({time: Date.now(), type:"output", text: txt}) + "\n")
    }
}

export default outputChannel;