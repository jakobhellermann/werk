export const RE_RUNNABLE = /^(task|build)\s+([^\s]+)\s*{/gm;

export type TargetKind = "task" | "build";
export type WerkTarget = { kind: TargetKind, target: string; index: number; };

export function* getTargets(werkfile: string): Generator<WerkTarget> {
    for (const match of werkfile.matchAll(RE_RUNNABLE)) {
        const [_, kind, target] = match;
        yield {
            kind: kind as ("task" | "build"),
            target,
            index: match.index,
        };
    }
}