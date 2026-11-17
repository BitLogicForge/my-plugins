import * as vscode from 'vscode';
import type { GitRepo } from '../git/GitRepo';
import { shellQuote } from '../util/text';
import type { EditorContext } from './EditorContext';

export type PickItem = vscode.QuickPickItem & { value: string };

/** Lists the choices for a variable; an empty list makes the user type the value instead. */
export type PickerResolver = (ctx: EditorContext) => Promise<PickItem[]>;

const git =
  (fn: (repo: GitRepo) => Promise<PickItem[]>): PickerResolver =>
  async (ctx) => {
    const repo = await ctx.git();
    return repo ? fn(repo) : [];
  };

const item = (value: string, icon: string, description?: string): PickItem => ({
  label: value,
  value,
  description,
  iconPath: new vscode.ThemeIcon(icon),
});

/** Reflog messages of commits; group 1 is the subject. */
const COMMIT_RE =
  /^(?:commit(?: \([\w ]+\))?|cherry-pick|revert|rebase(?: -i)? \((?:pick|reword|edit|squash|fixup)\)): (.*)$/;
const MAX_COMMITS = 40;

/** Variables that show a list to pick from. Keys are display names. */
export const PICKER_VARIABLES: Readonly<Record<string, PickerResolver>> = {
  'pick branch': git(async (r) => (await r.recentBranches()).map((b) => item(b, 'git-branch'))),
  'pick remote branch': git(async (r) =>
    (await r.listRefs('refs/remotes/'))
      .filter((b) => !b.endsWith('/HEAD'))
      .map((b) => item(b, 'cloud')),
  ),
  'pick tag': git(async (r) => (await r.tagsNewestFirst()).map((t) => item(t, 'tag'))),
  'pick stash': git(async (r) =>
    (await r.stashes()).map((e, i) => item(`stash@{${i}}`, 'archive', e.message)),
  ),
  'pick commit': git(async (r) => {
    // Recent commits made/moved in this worktree, from the HEAD reflog (no git process needed).
    const seen = new Set<string>();
    const items: PickItem[] = [];
    for (const e of await r.headReflog()) {
      const m = COMMIT_RE.exec(e.message);
      if (m && !seen.has(e.newSha)) {
        seen.add(e.newSha);
        items.push(item(e.newSha.slice(0, 7), 'git-commit', m[1]));
      }
      if (items.length >= MAX_COMMITS) {
        break;
      }
    }
    return items;
  }),
  'pick conflicted file': git(async (r) =>
    (await r.conflicts()).map((f) => ({ ...item(f, 'warning'), value: shellQuote(f) })),
  ),
  'pick remote': git(async (r) =>
    (await r.remotes()).map((rm) => ({ label: rm.name, value: rm.name, description: rm.url })),
  ),
};
