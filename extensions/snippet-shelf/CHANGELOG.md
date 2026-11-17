# Changelog

## 0.0.4

- Many more git variables: previous branch, upstream, remote, repo web URL/owner, repo file,
  head/short sha, branch ticket/prefix/topic, latest and next tags, git operation, conflicted
  files, user name/email. `{{current branch}}` now gives the real branch during a rebase.
- Pickers: `{{pick branch}}` (recent first), `{{pick remote branch}}`, `{{pick tag}}`,
  `{{pick stash}}`, `{{pick commit}}`, `{{pick conflicted file}}`, `{{pick remote}}`.
- Git state in the status bar, sidebar and list title (branch → upstream, rebase/merge in
  progress, conflict count).
- `"when"` on snippets: show them only during a rebase/merge/... and pin them at the top.
- `"action": "open"` opens a URL in the browser.
- Starter file: `Git: in progress`, `Git: commit`, `Git: tags`, `Git: browser` categories and
  pickers in branch/stash snippets.

## 0.0.3

- Git snippets in the starter file: sync, rebase & merge, conflicts, inspect, undo, branches &
  stash. History-rewriting ones use `"action": "paste"` so you confirm with Enter.
- New command `Snippet Shelf: Add Example Snippets`: adds the example snippets you don't have yet
  to your existing file (keeps your snippets and comments).

## 0.0.2

- Fix: the extension failed to start ("command not found") because `jsonc-parser` was bundled
  from its UMD build.
- Sidebar view in the Activity Bar with run/paste/insert/copy buttons.
- Safe test snippets in the starter file.

## 0.0.1

- Initial release: categorized snippets in `~/.snippet-shelf.jsonc`, built-in git/editor
  variables, prompted variables, run/paste/insert/copy actions.
