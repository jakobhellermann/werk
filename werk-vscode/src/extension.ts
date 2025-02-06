import * as vscode from 'vscode';
import { ExtensionContext, Disposable } from 'vscode';
import { Config } from './config';

const LANGUAGE_ID = "werk";

let disposables: Disposable[] = [];

export function activate(_context: ExtensionContext) {
    const config = new Config();
}

export function deactivate() {
    for (const disposable of disposables) {
        disposable.dispose();
    }
}