import * as vscode from "vscode";
import * as path from "path";
import * as util from "util";
import * as fs from "fs";
import * as werk from "./werk";

const fileRead = util.promisify(fs.readFile);

export interface WerkTaskDefinition {
    type: "werk",

    kind: werk.TargetKind,
    target: string;
}

export class TaskProvider implements vscode.TaskProvider {
    private werkPromise: Thenable<vscode.Task[]> | undefined;

    provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> {
        return this.werkPromise = detectTasks();
    }

    resolveTask(task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> {
        return task;
    }
}

async function detectTasks(): Promise<vscode.Task[]> {
    const tasks: vscode.Task[] = [];

    for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
        const werkfilePath = path.join(workspaceFolder.uri.fsPath, "Werkfile");

        try {
            const werkfile = await fileRead(werkfilePath, 'utf8');
            for (const target of werk.getTargets(werkfile)) {
                tasks.push(getWerkTask(workspaceFolder, werkfilePath, target));
            }
        } catch (e) {
            if (e instanceof Error && "code" in e && e.code === "ENOENT") {
                continue;
            }
            if (e instanceof Error) {
                vscode.window.showErrorMessage(e.message);
            }
        }
    }

    return tasks;
}

export function getWerkTask(workspaceFolder: vscode.WorkspaceFolder, werkfilePath: string, definition: werk.WerkTarget): vscode.Task {
    const execution = new vscode.ShellExecution(`werk -f "${werkfilePath}" ${definition.target}`);

    const task = new vscode.Task(
        { type: "werk", kind: definition.kind, target: definition.target } satisfies WerkTaskDefinition,
        workspaceFolder,
        definition.target,
        (definition.kind === "build") ? "werk (build)" : "werk",
        execution,
        []
    );
    task.presentationOptions.showReuseMessage = false;

    return task;
}