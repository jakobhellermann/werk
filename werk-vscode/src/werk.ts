import * as fs from "node:fs";
import * as path from "node:path";

// @ts-ignore
import wasmPath from "../../target/wasm-bindgen/release/wasm_glue_bg.wasm";
import * as glue from "../../target/wasm-bindgen/release/wasm_glue";

export function init() {
    const wasm = fs.readFileSync(path.join(__dirname, wasmPath));
    glue.initSync({ module: wasm });
}

export const RE_RUNNABLE = /^(task|build)\s+([^\s]+)\s*{/gm;

export type TargetKind = "task" | "build";
export type WerkTarget = { kind: TargetKind, target: string; span: [number, number]; docComment?: string; };

export function getTargets(werkfile: string): WerkTarget[] {
    return glue.get_targets("Werkfile", werkfile);
}