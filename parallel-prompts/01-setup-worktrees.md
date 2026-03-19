# Setup Worktrees

The current tree is already dirty in shared mechanism-arrow, lone-pair, settings, and hydrogen-toggle files. Create separate worktrees before running any prompt.

Commands:

```powershell
git switch -c wip/split-base
git add -A
git commit -m "WIP split base"

git worktree add ..\ketcher-lonepairs -b feat/lonepairs HEAD
git worktree add ..\ketcher-arrow-core -b feat/arrow-core HEAD
git worktree add ..\ketcher-arrow-render -b feat/arrow-render HEAD
```

Run each prompt in its own worktree:

- `..\ketcher-lonepairs` for [02-lone-pair-spacing.md](C:/ketcher/parallel-prompts/02-lone-pair-spacing.md)
- `..\ketcher-arrow-core` for [03-arrow-core-and-hydrogen-protection.md](C:/ketcher/parallel-prompts/03-arrow-core-and-hydrogen-protection.md)
- `..\ketcher-arrow-render` for [04-arrow-render-settings-and-color.md](C:/ketcher/parallel-prompts/04-arrow-render-settings-and-color.md)

Ask every terminal to report:

- changed files
- tests run
- unresolved edge cases

Do not merge blindly. Merge in the order listed in [README.md](C:/ketcher/parallel-prompts/README.md).
