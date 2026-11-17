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
      "action": "run" // optional: run | paste | insert | copy
    }
  ]
}
```

`body` can be a single string or an array of lines.

## Variables

Case and spaces are ignored in variable names, so `{{current branch}}`, `{{currentBranch}}` and
`{{current_branch}}` are the same variable.

| Variable | Value |
| --- | --- |
| `{{current branch}}` (`{{branch}}`) | checked-out branch (short commit id if detached) |
| `{{default branch}}` | `origin/HEAD` if set, otherwise the first of main/master/trunk/develop that exists |
| `{{remote url}}` | URL of `origin` (or of the first remote) |
| `{{repo name}}` | repository name from the remote URL (or the folder name) |
| `{{repo root}}` | repository root folder |
| `{{workspace folder}}`, `{{workspace name}}` | current workspace folder |
| `{{file}}`, `{{file name}}`, `{{file dir}}`, `{{relative file}}` | active editor file |
| `{{line}}` | cursor line number |
| `{{selection}}`, `{{clipboard}}` | selected text, clipboard text |
| `{{date}}`, `{{time}}`, `{{uuid}}` | `2026-11-17`, `14:05`, a random UUID |

Git values are read from the `.git` folder of the active file's repository (or the first
workspace folder). This works in dev container, WSL and SSH windows too.

`Snippet Shelf: Show Variable Values` lists what every variable resolves to right now.

### Prompts

Any other name is asked for when the snippet runs:

| Syntax | Prompt |
| --- | --- |
| `{{repo url}}` | text box |
| `{{remote branch=main}}` | text box prefilled with `main` |
| `{{type=feat\|fix\|chore}}` | pick from a list |

If the same name appears more than once, you are asked once. If a built-in variable has no value
(for example `{{current branch}}` outside a git repo), you are asked for it instead. Write `\{{`
to get a literal `{{`.

## Commands

| Command | Description |
| --- | --- |
| `Snippet Shelf: Show Snippets` | opens the list |
| `Snippet Shelf: Edit Snippets File` | opens `~/.snippet-shelf.jsonc` |
| `Snippet Shelf: Save Selection as Snippet` | saves the selected text as a new snippet (also in the editor context menu) and keeps the file's comments |
| `Snippet Shelf: Show Variable Values` | shows what each variable resolves to |

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
