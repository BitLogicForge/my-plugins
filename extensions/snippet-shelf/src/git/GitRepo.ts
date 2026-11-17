import * as vscode from 'vscode';
import { exists, readBytes, readText } from '../util/fs';
import {
  bumpSemver,
  compareSemverDesc,
  conflictsFromIndex,
  parseConfig,
  parseReflog,
  parseSemver,
  ReflogEntry,
  remoteToWebUrl,
} from './parsers';

/** Git operation in progress in the repository. */
export type Operation = 'rebase' | 'merge' | 'cherry-pick' | 'revert' | 'bisect' | 'am';

export interface Remote {
  name: string;
  url: string;
}

export interface Upstream {
  remote: string;
  branch: string;
  /** "origin/feature-x", or just the branch for a local upstream. */
  full: string;
}

/**
 * Read-only view of a git repository, read straight from the .git folder through
 * workspace.fs. That works for remote folders (dev container, WSL, SSH) even though this
 * extension runs locally, and needs no git process; it also means no commit-graph features
 * (merge base, ahead/behind counts).
 *
 * Results are cached per instance, so create a new one (via GitRepo.find) for fresh data.
 */
export class GitRepo {
  private readonly cache = new Map<string, Promise<unknown>>();

  private constructor(
    readonly root: vscode.Uri,
    /** .git dir of this worktree (HEAD, index, in-progress state). */
    private readonly gitDir: vscode.Uri,
    /** Shared .git dir (refs, config); differs from gitDir only for linked worktrees. */
    private readonly commonDir: vscode.Uri,
  ) {}

  /** Finds the repository containing `start`, walking up the folder tree. */
  static async find(start: vscode.Uri): Promise<GitRepo | undefined> {
    let dir = start;
    for (let i = 0; i < 64; i++) {
      const dotGit = vscode.Uri.joinPath(dir, '.git');
      const stat = await Promise.resolve(vscode.workspace.fs.stat(dotGit)).catch(() => undefined);
      if (stat) {
        let gitDir = dotGit;
        if (stat.type & vscode.FileType.File) {
          // worktree or submodule: ".git" is a file containing "gitdir: <path>"
          const m = /^gitdir:\s*(.+)$/m.exec((await readText(dotGit)) ?? '');
          if (!m) {
            return undefined;
          }
          gitDir = resolvePath(dir, m[1].trim());
        }
        const common = (await readText(vscode.Uri.joinPath(gitDir, 'commondir')))?.trim();
        return new GitRepo(dir, gitDir, common ? resolvePath(gitDir, common) : gitDir);
      }
      const parent = vscode.Uri.joinPath(dir, '..');
      if (parent.path === dir.path) {
        return undefined;
      }
      dir = parent;
    }
    return undefined;
  }

  // ----- state -----

  operation(): Promise<Operation | undefined> {
    return this.memo('operation', async () => {
      const has = (rel: string) => exists(vscode.Uri.joinPath(this.gitDir, rel));
      if (await has('rebase-merge')) {
        return 'rebase';
      }
      if (await has('rebase-apply')) {
        return (await has('rebase-apply/applying')) ? 'am' : 'rebase';
      }
      const markers: [string, Operation][] = [
        ['MERGE_HEAD', 'merge'],
        ['CHERRY_PICK_HEAD', 'cherry-pick'],
        ['REVERT_HEAD', 'revert'],
        ['BISECT_LOG', 'bisect'],
      ];
      for (const [file, op] of markers) {
        if (await has(file)) {
          return op;
        }
      }
      return undefined;
    });
  }

  /** Paths with unresolved conflicts (only during an operation). */
  conflicts(): Promise<string[]> {
    return this.memo('conflicts', async () => {
      if (!(await this.operation())) {
        return [];
      }
      const index = await readBytes(vscode.Uri.joinPath(this.gitDir, 'index'));
      return index ? conflictsFromIndex(index) : [];
    });
  }

  // ----- branches -----

  /** Checked-out branch. During a rebase HEAD is detached, so this is the branch being rebased. */
  branch(): Promise<string | undefined> {
    return this.memo('branch', async () => {
      if ((await this.operation()) === 'rebase') {
        for (const dir of ['rebase-merge', 'rebase-apply']) {
          const name = (await this.readOwn(`${dir}/head-name`))?.trim();
          if (name?.startsWith('refs/heads/')) {
            return name.slice('refs/heads/'.length);
          }
        }
      }
      const head = (await this.readOwn('HEAD'))?.trim();
      if (!head) {
        return undefined;
      }
      const m = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
      return m ? m[1] : head.slice(0, 7); // detached HEAD: short commit id
    });
  }

  async defaultBranch(): Promise<string | undefined> {
    const remote = (await this.primaryRemote())?.name ?? 'origin';
    const head = await this.readShared(`refs/remotes/${remote}/HEAD`);
    const m = head && /^ref:\s*refs\/remotes\/[^/]+\/(.+)$/.exec(head.trim());
    if (m) {
      return m[1];
    }
    const candidates = ['main', 'master', 'trunk', 'develop'];
    const remoteBranches = await this.listRefs(`refs/remotes/${remote}/`);
    const localBranches = await this.listRefs('refs/heads/');
    return (
      candidates.find((c) => remoteBranches.includes(c)) ??
      candidates.find((c) => localBranches.includes(c))
    );
  }

  async previousBranch(): Promise<string | undefined> {
    for (const e of await this.headReflog()) {
      const m = CHECKOUT_RE.exec(e.message);
      if (m) {
        return m[1];
      }
    }
    return undefined;
  }

  /** Local branches except the current one, recently checked out first. */
  async recentBranches(): Promise<string[]> {
    const all = await this.listRefs('refs/heads/');
    const current = await this.branch();
    const seen = new Set<string>();
    for (const e of await this.headReflog()) {
      const m = CHECKOUT_RE.exec(e.message);
      for (const name of m ? [m[2], m[1]] : []) {
        if (all.includes(name)) {
          seen.add(name);
        }
      }
    }
    return [...seen, ...all.filter((b) => !seen.has(b))].filter((b) => b !== current);
  }

  /** Tracking branch of the current branch, from [branch "x"] remote/merge. */
  async upstream(): Promise<Upstream | undefined> {
    const branch = await this.branch();
    const section = branch ? (await this.config()).get(`branch.${branch}`) : undefined;
    if (!section?.remote || !section.merge) {
      return undefined;
    }
    const upstreamBranch = section.merge.replace(/^refs\/heads\//, '');
    const full = section.remote === '.' ? upstreamBranch : `${section.remote}/${upstreamBranch}`;
    return { remote: section.remote, branch: upstreamBranch, full };
  }

  // ----- remotes / identity -----

  async remotes(): Promise<Remote[]> {
    const out: Remote[] = [];
    for (const [key, values] of await this.config()) {
      if (key.startsWith('remote.') && values.url) {
        out.push({ name: key.slice('remote.'.length), url: values.url });
      }
    }
    return out;
  }

  /** "origin" if it exists, otherwise the first remote. */
  async primaryRemote(): Promise<Remote | undefined> {
    const remotes = await this.remotes();
    return remotes.find((r) => r.name === 'origin') ?? remotes[0];
  }

  async webUrl(): Promise<string | undefined> {
    const url = (await this.primaryRemote())?.url;
    return url && remoteToWebUrl(url);
  }

  /** Name from the remote URL, else the root folder name. */
  async name(): Promise<string | undefined> {
    const url = (await this.primaryRemote())?.url;
    const fromUrl = url
      ?.replace(/\/+$/, '')
      .split(/[/:]/)
      .pop()
      ?.replace(/\.git$/, '');
    return fromUrl || this.root.path.split('/').filter(Boolean).pop();
  }

  async userSetting(key: 'name' | 'email'): Promise<string | undefined> {
    return (await this.config()).get('user')?.[key];
  }

  // ----- commits / tags / stashes -----

  async headSha(): Promise<string | undefined> {
    const head = (await this.readOwn('HEAD'))?.trim();
    const m = head && /^ref:\s*(.+)$/.exec(head);
    return m ? this.resolveRef(m[1]) : head || undefined;
  }

  /** Tags, highest vX.Y.Z first, then other tags. */
  async tagsNewestFirst(): Promise<string[]> {
    const tags = await this.listRefs('refs/tags/');
    const versioned = tags
      .map((t) => ({ t, s: parseSemver(t) }))
      .filter((x) => x.s)
      .sort((a, b) => compareSemverDesc(a.s!, b.s!))
      .map((x) => x.t);
    return [
      ...versioned,
      ...tags
        .filter((t) => !parseSemver(t))
        .sort()
        .reverse(),
    ];
  }

  async nextTag(part: 0 | 1 | 2): Promise<string | undefined> {
    const latest = (await this.tagsNewestFirst()).map(parseSemver).find(Boolean);
    return latest && bumpSemver(latest, part);
  }

  async stashes(): Promise<ReflogEntry[]> {
    return parseReflog((await this.readShared('logs/refs/stash')) ?? '');
  }

  async headReflog(): Promise<ReflogEntry[]> {
    return parseReflog((await this.readOwn('logs/HEAD')) ?? '');
  }

  // ----- refs -----

  /** Short names of all refs below `prefix` (e.g. "refs/heads/"), loose and packed. */
  listRefs(prefix: string): Promise<string[]> {
    return this.memo(`refs:${prefix}`, async () => {
      const names = new Set<string>();
      const walk = async (rel: string): Promise<void> => {
        const dir = vscode.Uri.joinPath(this.commonDir, rel);
        const entries = await Promise.resolve(vscode.workspace.fs.readDirectory(dir)).catch(
          () => [] as [string, vscode.FileType][],
        );
        await Promise.all(
          entries.map(async ([name, type]) => {
            if (type & vscode.FileType.Directory) {
              await walk(`${rel}${name}/`);
            } else {
              names.add(`${rel}${name}`.slice(prefix.length));
            }
          }),
        );
      };
      await walk(prefix);
      for (const [, ref] of await this.packedRefs()) {
        if (ref.startsWith(prefix)) {
          names.add(ref.slice(prefix.length));
        }
      }
      return [...names].sort();
    });
  }

  private async resolveRef(ref: string): Promise<string | undefined> {
    const loose = (await this.readShared(ref))?.trim();
    if (loose) {
      return loose;
    }
    return (await this.packedRefs()).find(([, name]) => name === ref)?.[0];
  }

  /** [sha, ref] pairs from packed-refs. */
  private async packedRefs(): Promise<[string, string][]> {
    const text = (await this.readShared('packed-refs')) ?? '';
    return text
      .split('\n')
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('^'))
      .map((l) => l.trim().split(' ') as [string, string]);
  }

  // ----- paths -----

  /** Path of `uri` relative to the repository root, or undefined if outside it. */
  relative(uri: vscode.Uri): string | undefined {
    const root = this.root.path.replace(/\/$/, '') + '/';
    return uri.authority === this.root.authority && uri.path.startsWith(root)
      ? uri.path.slice(root.length)
      : undefined;
  }

  // ----- reading -----

  private config(): Promise<Map<string, Record<string, string>>> {
    return this.memo('config', async () => parseConfig((await this.readShared('config')) ?? ''));
  }

  /** A file in the worktree's own .git dir. */
  private readOwn(rel: string): Promise<string | undefined> {
    return this.memo(`w:${rel}`, () => readText(vscode.Uri.joinPath(this.gitDir, rel)));
  }

  /** A file in the shared .git dir. */
  private readShared(rel: string): Promise<string | undefined> {
    return this.memo(`c:${rel}`, () => readText(vscode.Uri.joinPath(this.commonDir, rel)));
  }

  private memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let p = this.cache.get(key) as Promise<T> | undefined;
    if (!p) {
      p = fn();
      this.cache.set(key, p);
    }
    return p;
  }
}

const CHECKOUT_RE = /^checkout: moving from (\S+) to (\S+)$/;

function resolvePath(base: vscode.Uri, p: string): vscode.Uri {
  const posix = p.replace(/\\/g, '/');
  if (posix.startsWith('/')) {
    return base.with({ path: posix });
  }
  if (/^[A-Za-z]:\//.test(posix)) {
    return base.with({ path: '/' + posix });
  }
  return vscode.Uri.joinPath(base, posix);
}
