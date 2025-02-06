import * as vscode from 'vscode';
import { ExtensionContext, Disposable } from 'vscode';
import { Config } from './config';
import * as tasks from './tasks';

const LANGUAGE_ID = "werk";

let disposables: Disposable[] = [];

export function activate(_context: ExtensionContext) {
    const config = new Config();
    const taskProvider = new tasks.TaskProvider();

    disposables.push(vscode.tasks.registerTaskProvider("werk", taskProvider));
}

export function deactivate() {
    for (const disposable of disposables) {
        disposable.dispose();
    }
}