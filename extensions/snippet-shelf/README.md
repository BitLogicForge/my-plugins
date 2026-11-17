# Snippet Shelf

Your own snippets (shell commands, text), grouped into categories, in one JSONC file that every
VS Code profile and window shares. Snippets can use variables like `{{current branch}}` and can
ask you for values when they run.

## Use

- Click the **snippet icon** in the status bar, or the same icon in the terminal panel toolbar, or
  run `Snippet Shelf: Show Snippets`.
- **Enter** runs the snippet's default action, shown by its icon. The item buttons run the other
  actions:
  - `run`: send to the active terminal and press Enter (this is the default)
  - `paste`: put it in the terminal without running it
  - `insert`: insert at the cursor in the editor
  - `copy`: copy to the clipboard
  - `open`: open the body as a URL in the browser (e.g. `{{repo web url}}/compare/...`)
- Type to filter by name, category, description or body.
- The pencil button at the top opens the snippets file.

## The snippets file

The file is `~/.snippet-shelf.jsonc` on the local machine. It is created with examples the first
time you open the list. Comments and trailing commas are allowed. Changes take effect the next
time you open the list.

```jsonc
{
  "Git": [
    {
      "name": "Init repo from existing remote",
      "description": "optional",
      "body": [
        "git init",
        "git remote add origin {{repo url}}",
        "git fetch origin",
        "git merge origin/{{remote branch=main}} --allow-unrelated-histories"
      ],
      "action": "run", // optional: run | paste | insert | copy | open
      "when": "rebase" // optional: only show during a rebase (see Git context)
    }
  ]
}
```

`body` can be a single string or an array of lines.

## Git context

The extension keeps track of the repository of the active file (or the first workspace folder):

- **Status bar:** the snippet icon turns yellow and shows e.g. `⚠ rebase in progress · 2 conflicted
  files` while a rebase, merge, cherry-pick, revert, bisect or `git am` is in progress. Hover for
  repo, branch and upstream.
- **Sidebar:** the view title shows `branch → upstream`, and a warning line during an operation.
- **List title:** `Snippets · repo · branch → upstream · ⚠ rebase in progress`.
- **`when` snippets:** a snippet with `"when"` is shown only in that state, pinned at the top. The
  starter file's `Git: in progress` category uses this, so during a rebase you see *Continue
  rebase*, *Skip*, *Abort*, *Open a conflicted file*, *Mark a file as resolved*, and so on;
  otherwise they are hidden.

  ```jsonc
  { "name": "Continue rebase", "body": "git rebase --continue", "when": "rebase" }
  ```

  Values: `rebase`, `merge`, `cherry-pick`, `revert`, `bisect`, `am`, `in-progress` (any of
  those), `conflicts` (there are conflicted files), `idle` (nothing in progress). A string or a
  list.

The state is refreshed after each terminal command (with shell integration), when the window gets
focus, when you switch editors, and when `.git/HEAD` or the merge/rebase files change.

## Variables

Case and spaces are ignored in variable names, so `{{current branch}}`, `{{currentBranch}}` and
`{{current_branch}}` are the same variable. `Snippet Shelf: Show Variable Values` lists every
variable with its current value.

### Git

| Variable | Value (example) |
| --- | --- |
| `{{current branch}}` | checked-out branch; during a rebase, the branch being rebased |
| `{{default branch}}` | `origin/HEAD`, else the first of main/master/trunk/develop that exists |
| `{{previous branch}}` | the branch you were on before (from the reflog) |
| `{{upstream}}` | tracking branch, `origin/feat/ABC-123-login` |
| `{{upstream branch}}` | `feat/ABC-123-login` |
| `{{remote}}` | remote of the upstream, else `origin` / the first remote |
| `{{remote url}}` | `git@github.com:acme/widgets.git` |
| `{{repo web url}}` | `https://github.com/acme/widgets` (from ssh or https remotes) |
| `{{repo owner}}`, `{{repo name}}` | `acme`, `widgets` |
| `{{repo root}}` | repository root folder |
| `{{repo file}}` | active file relative to the repo root, `src/app.ts` |
| `{{head sha}}`, `{{short sha}}` | `ed72343ebc…`, `ed72343` |
| `{{branch ticket}}` | ticket in the branch name: `ABC-123` (or `123` from `fix/123-x`) |
| `{{branch prefix}}`, `{{branch topic}}` | `feat`, `ABC-123-login` |
| `{{latest tag}}` | highest `vX.Y.Z` tag, `v1.10.0` |
| `{{next patch tag}}`, `{{next minor tag}}`, `{{next major tag}}` | `v1.10.1`, `v1.11.0`, `v2.0.0` |
| `{{git operation}}` | `rebase`, `merge`, `cherry-pick`, `revert`, `bisect`, `am` |
| `{{conflicted files}}` | conflicted paths, shell-quoted: `f.txt 'sp ace.txt'` |
| `{{user name}}`, `{{user email}}` | from the repo's `.git/config` |

### Pickers (show a list to choose from)

| Variable | List |
| --- | --- |
| `{{pick branch}}` | local branches, recently used first, current excluded |
| `{{pick remote branch}}` | `origin/...` branches |
| `{{pick tag}}` | tags, newest version first |
| `{{pick stash}}` | `stash@{0}`… with their messages |
| `{{pick commit}}` | recent commits from the HEAD reflog, with subjects |
| `{{pick conflicted file}}` | conflicted files (shell-quoted) |
| `{{pick remote}}` | remotes |

### Editor and other

| Variable | Value |
| --- | --- |
| `{{workspace folder}}`, `{{workspace name}}` | current workspace folder |
| `{{file}}`, `{{file name}}`, `{{file dir}}`, `{{relative file}}` | active editor file |
| `{{line}}` | cursor line number |
| `{{selection}}`, `{{clipboard}}` | selected text, clipboard text |
| `{{date}}`, `{{time}}`, `{{uuid}}` | `2026-11-17`, `14:05`, a random UUID |

Git values are read straight from the `.git` folder (no `git` process), so they also work in dev
container, WSL and SSH windows, in linked worktrees, and with packed refs. Because of that there
is nothing that needs the commit graph (merge base, ahead/behind counts); use `$(git ...)` inside
the snippet for those, e.g. `git rebase -i $(git merge-base HEAD origin/{{default branch}})`.

### Prompts

Any other name is asked for when the snippet runs:

| Syntax | Prompt |
| --- | --- |
| `{{repo url}}` | text box |
| `{{remote branch=main}}` | text box prefilled with `main` |
| `{{type=feat\|fix\|chore}}` | pick from a list |

If the same name appears more than once, you are asked once. If a variable has no value here (for
example `{{upstream}}` on a branch that was never pushed) or a picker has nothing to show, you are
asked for it instead. Write `\{{` to get a literal `{{`.

## Commands

| Command | Description |
| --- | --- |
| `Snippet Shelf: Show Snippets` | opens the list |
| `Snippet Shelf: Edit Snippets File` | opens `~/.snippet-shelf.jsonc` |
| `Snippet Shelf: Save Selection as Snippet` | saves the selected text as a new snippet (also in the editor context menu) and keeps the file's comments |
| `Snippet Shelf: Show Variable Values` | shows what each variable resolves to |
| `Snippet Shelf: Add Example Snippets` | adds the built-in example snippets (git sync, rebase, conflicts, undo…) that your file doesn't have yet; your own snippets and comments are kept |

### Keybindings

Bind a key to one snippet, or to one category, in `keybindings.json`:

```jsonc
{ "key": "ctrl+alt+p", "command": "snippetShelf.run", "args": { "name": "Push current branch" } },
{ "key": "ctrl+alt+g", "command": "snippetShelf.show", "args": { "category": "Git" } }
```

`snippetShelf.run` also takes `"category"` (if two categories have a snippet with the same name)
and `"action"` (to override the default action).

## Install

This is a UI extension (`extensionKind: ["ui"]`), so it runs in your local VS Code, including in
remote windows, and it always reads the same local file. Install the `.vsix` into **local** VS
Code. To have it in every profile, right-click it in the Extensions view and choose
**Apply Extension to all Profiles**.

When you debug with F5 from inside the dev container, the Extension Development Host runs in the
container, so it uses the file in the container's home folder instead.

## Code layout

`src/extension.ts` only builds the objects and wires them together; everything else is a small
class or module with one job:

| Folder | Contents |
| --- | --- |
| `store/` | `SnippetStore` (read, validate, edit and watch the snippets file), `seed.ts` (examples) |
| `git/` | `GitRepo` (reads `.git` directly), `GitState` (summary), `GitStateMonitor` (keeps it fresh), `parsers.ts` (pure format parsers) |
| `variables/` | `EditorContext`, built-in values, pickers, `VariableRegistry`, `TemplateExpander` (`{{...}}` → text) |
| `snippets/` | model, grouping (`when` / pinned), `SnippetRunner` (terminal, editor, clipboard, browser) |
| `ui/` | `StatusIndicator`, `SnippetTreeView` + `SnippetTreeProvider`, `SnippetQuickPick` |
| `commands/` | `CommandController` and the larger commands (`SaveSelectionCommand`, `ShowVariablesCommand`) |
