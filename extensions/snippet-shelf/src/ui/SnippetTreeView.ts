import * as vscode from 'vscode';
import type { GitState } from '../git/GitState';
import type { GitStateMonitor } from '../git/GitStateMonitor';
import { Action, ACTIONS } from '../snippets/model';
import type { SnippetRunner } from '../snippets/SnippetRunner';
import type { SnippetStore } from '../store/SnippetStore';
import { isSnippet, SnippetTreeProvider, TreeNode } from './SnippetTreeProvider';

/** The sidebar view: tree, title/message with the git state, and its item commands. */
export class SnippetTreeView implements vscode.Disposable {
  private readonly provider: SnippetTreeProvider;
  private readonly view: vscode.TreeView<TreeNode>;
  private readonly disposables: vscode.Disposable[];

  constructor(
    private readonly store: SnippetStore,
    private readonly runner: SnippetRunner,
    private readonly monitor: GitStateMonitor,
  ) {
    this.provider = new SnippetTreeProvider(store);
    this.view = vscode.window.createTreeView('snippetShelf.tree', {
      treeDataProvider: this.provider,
      showCollapseAll: true,
    });
    this.showState(monitor.state);

    this.disposables = [
      this.view,
      store.onDidChange(() => this.provider.refresh()),
      monitor.onDidChange((s) => this.showState(s)),
      vscode.commands.registerCommand('snippetShelf.tree.refresh', () => this.refresh()),
      vscode.commands.registerCommand('snippetShelf.tree.default', (n?: TreeNode) =>
        this.perform(n),
      ),
      ...ACTIONS.map((a) =>
        vscode.commands.registerCommand(`snippetShelf.tree.${a}`, (n?: TreeNode) =>
          this.perform(n, a),
        ),
      ),
      vscode.commands.registerCommand('snippetShelf.tree.reveal', (n?: TreeNode) => {
        const snippet = this.target(n);
        if (snippet) {
          void this.store.reveal(snippet);
        }
      }),
    ];
  }

  private showState(state: GitState | undefined): void {
    this.view.description = state?.branchText;
    const op = state?.operationText;
    this.view.message = op ? `⚠ ${op[0].toUpperCase()}${op.slice(1)}` : undefined;
    this.provider.setState(state);
  }

  private async refresh(): Promise<void> {
    await this.monitor.refresh();
    this.provider.refresh();
  }

  private perform(node: TreeNode | undefined, action?: Action): void {
    const snippet = this.target(node);
    if (snippet) {
      void this.runner.perform(snippet, action);
    }
  }

  /** The clicked node, or the selection when invoked by keybinding. */
  private target(node: TreeNode | undefined) {
    const n = node ?? this.view.selection[0];
    return n && isSnippet(n) ? n : undefined;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
