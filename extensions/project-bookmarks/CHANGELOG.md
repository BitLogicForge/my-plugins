# Changelog

## 0.0.3

- Activity bar icon with a sidebar view of the bookmarks.
- Categories: set `"category"` on a bookmark in the JSON file. Collapsed categories are remembered.
- The list updates when the file is saved, and an invalid file is never overwritten.

## 0.0.2

- Bookmarks are stored in `~/.vscode-project-bookmarks.json`, shared by every profile and window
  (previously per-profile globalState; old bookmarks are merged in on first start).
- New command: `Project Bookmarks: Open Bookmarks File`.

## 0.0.1

- Initial version: bookmark the current project with a label, open bookmarks in the current or a
  new window from the status bar, rename and remove them.
