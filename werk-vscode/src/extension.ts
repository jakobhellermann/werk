import * as vscode from 'vscode';
import { ExtensionContext, languages, commands, Disposable, window, Range } from 'vscode';
import { Config } from './config';
import * as tasks from './tasks';
import { WerkTarget } from './werk';
import { CodelensProvider } from './codelens';

const LANGUAGE_ID = "werk";

let disposables: Disposable[] = [];

export function activate(_context: ExtensionContext) {
    const config = new Config();
    const taskProvider = new tasks.TaskProvider();
    const codelensProvider = new CodelensProvider(config);

    disposables.push(vscode.tasks.registerTaskProvider("werk", taskProvider));
    disposables.push(languages.registerCodeLensProvider({ language: LANGUAGE_ID, }, codelensProvider));

    commands.registerCommand("werk.run", (werkfilePath: string, target: WerkTarget) => {
        let found = false;
        for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
            if (werkfilePath.startsWith(workspaceFolder.uri.fsPath)) {
                const task = tasks.getWerkTask(workspaceFolder, werkfilePath, target);
                vscode.tasks.executeTask(task);
                found = true;
            }
        }
        if (!found) {
            vscode.window.showInformationMessage(`Werkfile at ${werkfilePath} belongs to no open workspace`);
        }
    });
}

export function deactivate() {
    for (const disposable of disposables) {
        disposable.dispose();
    }
}