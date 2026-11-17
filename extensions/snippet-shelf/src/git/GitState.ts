import { EditorContext } from '../variables/EditorContext';
import type { Operation } from './GitRepo';

/** Summary of the repository state, shown in the status bar, sidebar and list title. */
export class GitState {
  private constructor(
    readonly repoName: string | undefined,
    readonly branch: string | undefined,
    readonly upstream: string | undefined,
    readonly operation: Operation | undefined,
    readonly conflicts: readonly string[],
  ) {}

  /** Reads the state of the active file's repository; undefined outside a repository. */
  static async read(ctx = new EditorContext()): Promise<GitState | undefined> {
    const git = await ctx.git();
    if (!git) {
      return undefined;
    }
    const [name, branch, upstream, operation, conflicts] = await Promise.all([
      git.name(),
      git.branch(),
      git.upstream(),
      git.operation(),
      git.conflicts(),
    ]);
    return new GitState(name, branch, upstream?.full, operation, conflicts);
  }

  /** "rebase in progress · 2 conflicted files", or undefined when nothing is in progress. */
  get operationText(): string | undefined {
    if (!this.operation) {
      return undefined;
    }
    const n = this.conflicts.length;
    return `${this.operation} in progress${n ? ` · ${n} conflicted file${n === 1 ? '' : 's'}` : ''}`;
  }

  /** "main → origin/main". */
  get branchText(): string | undefined {
    return this.branch && `${this.branch}${this.upstream ? ` → ${this.upstream}` : ''}`;
  }

  /** Parts for titles and tooltips: repo, branch, operation. */
  get summaryParts(): string[] {
    const op = this.operationText;
    return [this.repoName ?? 'repo', this.branchText, op && `⚠ ${op}`].filter(
      (p): p is string => !!p,
    );
  }

  /** Whether a snippet "when" value applies now. */
  matches(when: string): boolean {
    return (
      when === this.operation ||
      (when === 'in-progress' && !!this.operation) ||
      (when === 'conflicts' && this.conflicts.length > 0)
    );
  }

  /** Changes when something that affects which snippets are shown changes. */
  get visibilityKey(): string {
    return `${this.operation ?? ''}:${this.conflicts.length}`;
  }
}
