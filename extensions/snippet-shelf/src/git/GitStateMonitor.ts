import * as vscode from 'vscode';
import { GitState } from './GitState';

const GIT_FILES =
  '.git/{HEAD,MERGE_HEAD,CHERRY_PICK_HEAD,REVERT_HEAD,REBASE_HEAD,BISECT_LOG,rebase-merge,rebase-apply}';

/**
 * Keeps the current GitState up to date and announces changes. Refreshes after terminal
 * commands, on window focus, editor switches, and when the HEAD / rebase / merge files change.
 */
export class GitStateMonitor implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<GitState | undefined>();
  readonly onDidChange = this.emitter.event;

  private current: GitState | undefined;
  private timer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [this.emitter];

  constructor() {
    const schedule = () => this.schedule();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(folder, GIT_FILES),
      );
      watcher.onDidChange(schedule);
      watcher.onDidCreate(schedule);
      watcher.onDidDelete(schedule);
      this.disposables.push(watcher);
    }
    this.disposables.push(
      // A finished terminal command (git rebase, git add, ...) can change the state.
      vscode.window.onDidEndTerminalShellExecution(schedule),
      vscode.window.onDidCloseTerminal(schedule),
      vscode.window.onDidChangeWindowState((s) => s.focused && schedule()),
      vscode.window.onDidChangeActiveTextEditor(schedule),
      vscode.workspace.onDidChangeWorkspaceFolders(schedule),
    );
    void this.refresh();
  }

  get state(): GitState | undefined {
    return this.current;
  }

  /** Reads the state now and notifies listeners. */
  async refresh(): Promise<GitState | undefined> {
    this.current = await GitState.read().catch(() => undefined);
    this.emitter.fire(this.current);
    return this.current;
  }

  /** Debounced refresh, for bursts of events. */
  schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.refresh(), 300);
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.disposables.forEach((d) => d.dispose());
  }
}
