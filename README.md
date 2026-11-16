# my-plugins

A monorepo for my own VS Code extensions. It uses npm workspaces with one folder per extension.

```
extensions/<name>/      one VS Code extension each (own package.json + scripts)
templates/extension/    template used by the scaffolder
scripts/build.mjs       shared esbuild bundler (src/extension.ts -> dist/extension.js)
scripts/new-extension.mjs   scaffold a new extension
scripts/sync-launch.mjs     regenerate .vscode/launch.json from extensions/
packages/               built .vsix files (git-ignored)
```

Shared tooling (TypeScript, esbuild, ESLint, vsce, @types/vscode) lives in the root `package.json`.

## New extension

```bash
node scripts/new-extension.mjs my-thing --display "My Thing" --publisher local
npm install
```

This copies the template, fills in the names and regenerates the debug configs.

## Develop / debug

Press **F5** and pick `Run: <name>` (or `Run: all extensions`). The `watch: all` task rebuilds
every extension on save. Press `Ctrl+R` in the Extension Development Host window to reload.

## Per-extension commands

Run these from `extensions/<name>`, or from the root with `-w extensions/<name>`:

| Script | What it does |
| --- | --- |
| `npm run build` / `watch` | bundle with esbuild |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | integration tests via `@vscode/test-cli` (needs a display) |
| `npm run package` | production build + `.vsix` into `packages/` |

Install a built extension into your normal VS Code:

```bash
code --install-extension packages/<name>-<version>.vsix
```

## Notes

- The devcontainer's `postStartCommand` overwrites the root `package.json` `"scripts"` with the
  shared template, so all real scripts live in each extension's `package.json` and in
  `.vscode/tasks.json`.
- Keep `@types/vscode` (root) at or below each extension's `engines.vscode` minimum (currently
  `1.100.0`); `vsce` refuses to package otherwise.
- TypeScript is held on 6.x because `typescript-eslint` doesn't support 7 yet.
