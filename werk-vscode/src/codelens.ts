import * as vscode from 'vscode';
import { Config } from './config';
import * as werk from "./werk";

export class CodelensProvider implements vscode.CodeLensProvider {
    private config: Config;

    private codeLenses: vscode.CodeLens[] = [];
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    constructor(config: Config) {
        this.config = config;

        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        if (!this.config.enableCodeLens) return [];
        if (document.uri.scheme !== "file") return [];

        this.codeLenses = [];

        const text = document.getText();
        for (const runnable of werk.getTargets(text)) {
            const line = document.lineAt(document.positionAt(runnable.index).line);
            const indexOf = line.text.indexOf(runnable.target);
            const position = new vscode.Position(line.lineNumber, indexOf);

            const range = document.getWordRangeAtPosition(position, werk.RE_RUNNABLE);
            if (range) {
                let command = {
                    title: "Run",
                    tooltip: runnable.target,
                    command: "werk.run",
                    arguments: [document.uri.fsPath, runnable]
                };

                this.codeLenses.push(new vscode.CodeLens(range, command));
            }
        }
        return this.codeLenses;
    }
}