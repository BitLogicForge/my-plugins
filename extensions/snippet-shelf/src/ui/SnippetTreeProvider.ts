import * as vscode from 'vscode';
import type { GitState } from '../git/GitState';
import { ACTION_INFO, preview, Snippet } from '../snippets/model';
import { groupSnippets, SnippetGroup } from '../snippets/SnippetGroup';
import type { SnippetStore } from '../store/SnippetStore';

export type TreeNode = SnippetGroup | Snippet;
export const isSnippet = (n: TreeNode): n is Snippet => 'body' in n;

/** Tree data for the sidebar: groups (pinned first, then categories) with their snippets. */
export class SnippetTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private state: GitState | undefined;

  constructor(private readonly store: SnippetStore) {}

  refresh(): void {
    this.changed.fire();
  }

  /** Re-renders only when the change affects which snippets are shown. */
  setState(state: GitState | undefined): void {
    const changed = state?.visibilityKey !== this.state?.visibilityKey;
    this.state = state;
    if (changed) {
      this.refresh();
    }
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    if (node) {
      return isSnippet(node) ? [] : [...node.snippets];
    }
    return groupSnippets((await this.store.load()) ?? [], this.state);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return isSnippet(node) ? this.snippetItem(node) : this.groupItem(node);
  }

  private groupItem(group: SnippetGroup): vscode.TreeItem {
    const item = new vscode.TreeItem(group.title, vscode.TreeItemCollapsibleState.Expanded);
    item.id = group.pinned ? 'pinned' : `cat:${group.title}`;
    item.iconPath = group.pinned
      ? new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'))
      : new vscode.ThemeIcon('folder');
    item.description = String(group.snippets.length);
    item.contextValue = 'category';
    return item;
  }

  private snippetItem(snippet: Snippet): vscode.TreeItem {
    const item = new vscode.TreeItem(snippet.name, vscode.TreeItemCollapsibleState.None);
    item.id = `snip:${snippet.category}:${snippet.index}`;
    item.iconPath = new vscode.ThemeIcon(ACTION_INFO[snippet.action].icon);
    item.description = snippet.description ?? preview(snippet.body);
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${snippet.name}** · Enter: ${ACTION_INFO[snippet.action].label}\n\n`);
    tooltip.appendCodeblock(snippet.body, snippet.action === 'open' ? 'text' : 'shellscript');
    item.tooltip = tooltip;
    // No click command: running is done with the inline buttons or Enter, so a stray click never
    // runs a command in the terminal. contextValue picks the buttons (see package.json menus).
    item.contextValue = snippet.action === 'open' ? 'snippetOpen' : 'snippet';
    return item;
  }
}
