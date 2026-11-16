# Project Bookmarks

Bookmark the project open in the current window (local folder, WSL, dev container, SSH, or a
`.code-workspace` file) under a label, then reopen any bookmark from the status bar.

## Use

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

The extension is a UI extension (`extensionKind: ["ui"]`), so it runs in your local VS Code, even
in a dev container window. Bookmarks live in its global state on the local machine and are shared by
every window. Install the `.vsix` into **local** VS Code (it should be listed under
"Local - Installed" in the Extensions view), not into a container.

When you debug with F5 from inside the dev container, the Extension Development Host runs the
extension in the container, so bookmarks made there are separate from your installed copy.
