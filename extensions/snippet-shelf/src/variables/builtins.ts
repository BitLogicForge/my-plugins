import * as path from 'node:path';
import * as vscode from 'vscode';
import type { GitRepo } from '../git/GitRepo';
import { splitBranch, ticketFromBranch } from '../git/parsers';
import { pad2, shellQuote } from '../util/text';
import type { EditorContext } from './EditorContext';

/** Computes a variable's value; undefined means "not available here" (the user is asked). */
export type ValueResolver = (
  ctx: EditorContext,
) => Thenable<string | undefined> | string | undefined;

/** A resolver that needs a git repository (undefined outside one). */
const git =
  (
    fn: (repo: GitRepo, ctx: EditorContext) => Thenable<string | undefined> | string | undefined,
  ): ValueResolver =>
  async (ctx) => {
    const repo = await ctx.git();
    return repo ? fn(repo, ctx) : undefined;
  };

const fsPath = (uri: vscode.Uri | undefined) => uri?.fsPath;
const branchPart = (part: 'prefix' | 'topic') =>
  git(async (r) => splitBranch((await r.branch()) ?? '')[part]);

/** Variables with a single value. Keys are display names; lookup ignores case and spaces. */
export const VALUE_VARIABLES: Readonly<Record<string, ValueResolver>> = {
  // --- git: branches
  'current branch': git((r) => r.branch()),
  'default branch': git((r) => r.defaultBranch()),
  'previous branch': git((r) => r.previousBranch()),
  upstream: git(async (r) => (await r.upstream())?.full),
  'upstream branch': git(async (r) => (await r.upstream())?.branch),
  'branch ticket': git(async (r) => ticketFromBranch((await r.branch()) ?? '')),
  'branch prefix': branchPart('prefix'),
  'branch topic': branchPart('topic'),
  // --- git: remote / repo
  remote: git(async (r) => (await r.upstream())?.remote ?? (await r.primaryRemote())?.name),
  'remote url': git(async (r) => (await r.primaryRemote())?.url),
  'repo web url': git((r) => r.webUrl()),
  'repo owner': git(async (r) => {
    const web = await r.webUrl();
    const owner = web && new URL(web).pathname.split('/').filter(Boolean).slice(0, -1).join('/');
    return owner || undefined;
  }),
  'repo name': git((r) => r.name()),
  'repo root': git((r) => fsPath(r.root)),
  'repo file': git((r, c) => c.file && r.relative(c.file)),
  // --- git: commits / tags / state
  'head sha': git((r) => r.headSha()),
  'short sha': git(async (r) => (await r.headSha())?.slice(0, 7)),
  'latest tag': git(async (r) => (await r.tagsNewestFirst())[0]),
  'next patch tag': git((r) => r.nextTag(2)),
  'next minor tag': git((r) => r.nextTag(1)),
  'next major tag': git((r) => r.nextTag(0)),
  'git operation': git((r) => r.operation()),
  'conflicted files': git(async (r) => {
    const files = await r.conflicts();
    return files.length ? files.map(shellQuote).join(' ') : undefined;
  }),
  'user name': git((r) => r.userSetting('name')),
  'user email': git((r) => r.userSetting('email')),
  // --- editor / workspace
  'workspace folder': (c) => fsPath(c.folder?.uri),
  'workspace name': (c) => c.folder?.name,
  file: (c) => fsPath(c.file),
  'file name': (c) => c.file && path.posix.basename(c.file.path),
  'file dir': (c) => c.file && fsPath(vscode.Uri.joinPath(c.file, '..')),
  'relative file': (c) => c.file && vscode.workspace.asRelativePath(c.file, false),
  line: (c) => (c.editor ? String(c.editor.selection.active.line + 1) : undefined),
  selection: (c) =>
    c.editor && !c.editor.selection.isEmpty
      ? c.editor.document.getText(c.editor.selection)
      : undefined,
  clipboard: () => vscode.env.clipboard.readText(),
  date: () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  },
  time: () => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  },
  uuid: () => crypto.randomUUID(),
};
