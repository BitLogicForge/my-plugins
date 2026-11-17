import * as vscode from 'vscode';
import type { GitState } from '../git/GitState';
import type { GitStateMonitor } from '../git/GitStateMonitor';

/** Status bar icon that opens the list and warns while a rebase/merge/... is in progress. */
export class StatusIndicator implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(
    'snippetShelf.status',
    vscode.StatusBarAlignment.Left,
    -1,
  );
  private readonly subscription: vscode.Disposable;

  constructor(monitor: GitStateMonitor) {
    this.item.name = 'Snippet Shelf';
    this.item.command = 'snippetShelf.show';
    this.update(monitor.state);
    this.item.show();
    this.subscription = monitor.onDidChange((s) => this.update(s));
  }

  private update(state: GitState | undefined): void {
    const op = state?.operationText;
    this.item.text = op ? `$(symbol-snippet) $(warning) ${op}` : '$(symbol-snippet)';
    this.item.backgroundColor = op
      ? new vscode.ThemeColor('statusBarItem.warningBackground')
      : undefined;
    this.item.tooltip = new vscode.MarkdownString(
      ['**Snippet Shelf**', ...(state?.summaryParts ?? [])].join('\n\n'),
    );
  }

  dispose(): void {
    this.subscription.dispose();
    this.item.dispose();
  }
}
