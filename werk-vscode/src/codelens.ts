import * as vscode from 'vscode';
import { Config } from './config';
import * as werk from "./werk";

export class CodelensProvider implements vscode.CodeLensProvider {
    private config: Config;

    private codeLenses: vscode.CodeLens[] = [];
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    private cacheKey: number | undefined;

    constructor(config: Config) {
        this.config = config;

        vscode.workspace.onDidChangeConfiguration((_) => {
            this._onDidChangeCodeLenses.fire();
        });
    }

    public provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        if (!this.config.enableCodeLens) return [];

        if (document.uri.scheme !== "file") return [];


        const werkfile = document.getText();
        let cacheKey = (werkfile.match(/\n/g) ?? '').length; // invalidate when lines might change
        try {
            this.codeLenses = werk.getTargets(werkfile).map(target => {
                const line = document.lineAt(document.positionAt(target.span[0]).line);
                let command = {
                    title: "Run",
                    tooltip: target.target,
                    command: "werk.run",
                    arguments: [document.uri.fsPath, target]
                };

                return new vscode.CodeLens(line.range, command);
            });
        } catch (e) {
            if (this.cacheKey != cacheKey) {
                this.codeLenses = [];
            }
        }
        console.log(`has ${this.codeLenses.length}`);

        this.cacheKey = cacheKey;
        return this.codeLenses;
    }
}