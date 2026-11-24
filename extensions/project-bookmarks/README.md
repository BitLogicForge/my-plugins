# Project Bookmarks

Bookmark the project open in the current window (local folder, WSL, dev container, SSH, or a
`.code-workspace` file) under a label, then reopen any bookmark from the sidebar or the status bar.

## Sidebar

Click the **bookmarks icon** in the activity bar (left). Hover a bookmark for **open here**, **open in
new window** and **edit in JSON**; right-click for rename and remove. Enter opens the selected bookmark
in the current window. Click a category to collapse or expand it; this is remembered.

## Categories

Click the pencil at the top of the sidebar to open the bookmarks file, and add `"category"` to any
bookmark. Save, and the sidebar updates:

```json
[
  { "label": "API", "category": "Work", "uri": "file:///home/me/api" },
  { "label": "Notes", "uri": "file:///home/me/notes" }
]
```

Bookmarks without a category are listed below the categories. Order follows the file.

## Status bar

- Click the **bookmark icon** in the status bar (bottom left) to see your bookmarks.
  - **Enter** opens the bookmark in the current window.
  - Item buttons: **open in new window**, **rename**, **remove**.
  - When the current project is not bookmarked, the first entry is **Bookmark current project…**,
    which asks for a label (defaults to the folder name).
- The current project is marked with a check and `· current`.

## Commands

| Command                                                    | Description                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| `Project Bookmarks: Show Bookmarks`                        | Opens the bookmark list (same as the status bar icon).               |
| `Project Bookmarks: Bookmark Current Project`              | Adds the current project, or renames it if it is already bookmarked. |
| `Project Bookmarks: Remove Current Project from Bookmarks` | Removes the current project.                                         |

## Where bookmarks are stored

Bookmarks are kept in `~/.vscode-project-bookmarks.json` on the local machine (on Windows,
`C:\\Users\\<you>\\.vscode-project-bookmarks.json`). The same file is used by every window and every VS
Code profile. `Project Bookmarks: Open Bookmarks File` opens it if you want to edit it by hand.

The extension is a UI extension (`extensionKind: ["ui"]`), so it runs in your local VS Code, even
in a dev container window. Install the `.vsix` into **local** VS Code (it should be listed under
"Local - Installed" in the Extensions view), not into a container. To have it in every profile,
right-click it in the Extensions view and choose **Apply Extension to all Profiles**.

When you debug with F5 from inside the dev container, the Extension Development Host runs the
extension in the container, so it reads the file in the container's home folder instead.
