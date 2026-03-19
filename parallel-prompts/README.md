# Parallel Prompt Pack

Use separate git worktrees for these prompts. Do not run them in the same checkout.

Files in this folder:

1. [01-setup-worktrees.md](C:/ketcher/parallel-prompts/01-setup-worktrees.md)
2. [02-lone-pair-spacing.md](C:/ketcher/parallel-prompts/02-lone-pair-spacing.md)
3. [03-arrow-core-and-hydrogen-protection.md](C:/ketcher/parallel-prompts/03-arrow-core-and-hydrogen-protection.md)
4. [04-arrow-render-settings-and-color.md](C:/ketcher/parallel-prompts/04-arrow-render-settings-and-color.md)

Recommended merge order:

1. `feat/lonepairs`
2. `feat/arrow-core`
3. Rebase `feat/arrow-render` onto merged `feat/arrow-core`
4. Merge `feat/arrow-render`

Important split rule:

- Do not have two prompts touch `packages/ketcher-core/src/application/render/draw.ts` in parallel.
- Do not have two prompts touch `packages/ketcher-core/src/application/render/restruct/rerxnarrow.ts` in parallel.
- Do not split `curlyArrow.ts`, `reactionArrowMoveTool.ts`, and `RxnArrowResize.ts` across different prompts.
- Do not split `lonePairUtils.ts` away from `reatom.ts`.
