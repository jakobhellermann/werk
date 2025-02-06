import * as vscode from "vscode";
import { WorkspaceConfiguration } from "vscode";

export class Config {
    static readonly rootSection = "werk";

    private get config(): WorkspaceConfiguration {
        return vscode.workspace.getConfiguration(Config.rootSection);
    }

    private get<T>(path: string): T {
        return this.config.get<T>(path)!;
    }
}