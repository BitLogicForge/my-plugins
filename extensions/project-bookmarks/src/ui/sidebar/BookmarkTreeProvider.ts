import * as vscode from 'vscode';
import { BookmarkGroup, groupBookmarks } from '../../bookmarks/BookmarkGroup';
import type { Bookmark } from '../../bookmarks/Bookmark';
import { ItemContext } from '../../constants';
import type { BookmarkStore } from '../../store/BookmarkStore';
import { DisposableStore } from '../../util/DisposableStore';
import { BookmarkPresentation } from '../BookmarkPresentation';
import type { CollapseState } from './CollapseState';

export type TreeNode = BookmarkGroup | Bookmark;

/** Categories first, then the bookmarks without a category. */
export class BookmarkTreeProvider
  extends DisposableStore
  implements vscode.TreeDataProvider<TreeNode>
{
  private readonly changed = this.register(new vscode.EventEmitter<void>());
  readonly onDidChangeTreeData = this.changed.event;

  constructor(
    private readonly store: BookmarkStore,
    private readonly collapseState: CollapseState,
  ) {
    super();
  }

  refresh(): void {
    this.changed.fire();
  }

  getChildren(node?: TreeNode): TreeNode[] {
    if (node) {
      return node instanceof BookmarkGroup ? node.bookmarks : [];
    }
    const { groups, uncategorized } = groupBookmarks(this.store.list);
    return [...groups, ...uncategorized];
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    return node instanceof BookmarkGroup ? this.groupItem(node) : this.bookmarkItem(node);
  }

  private groupItem(group: BookmarkGroup): vscode.TreeItem {
    const item = new vscode.TreeItem(
      group.title,
      this.collapseState.isCollapsed(group.title)
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.Expanded,
    );
    item.id = `cat:${group.title}`;
    item.description = String(group.bookmarks.length);
    item.contextValue = ItemContext.category;
    return item;
  }

  private bookmarkItem(bookmark: Bookmark): vscode.TreeItem {
    const look = new BookmarkPresentation(bookmark);
    // No id: the same project may be listed twice in the file, and ids must be unique.
    const item = new vscode.TreeItem(bookmark.label, vscode.TreeItemCollapsibleState.None);
    item.iconPath = look.icon;
    item.description = look.description;
    item.tooltip = look.tooltip;
    // No click command: a stray click would replace the window. Opening is an inline button or
    // Enter. contextValue picks the buttons (see package.json menus).
    item.contextValue = look.isCurrent ? ItemContext.currentBookmark : ItemContext.bookmark;
    return item;
  }
}
