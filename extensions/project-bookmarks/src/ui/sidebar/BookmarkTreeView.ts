import * as vscode from 'vscode';
import { BookmarkGroup } from '../../bookmarks/BookmarkGroup';
import { ContextKeys, VIEW_ID } from '../../constants';
import type { BookmarkStore } from '../../store/BookmarkStore';
import { setContext } from '../../util/context';
import { DisposableStore } from '../../util/DisposableStore';
import { BookmarkTreeProvider, TreeNode } from './BookmarkTreeProvider';
import type { CollapseState } from './CollapseState';

/** The sidebar view: shows the tree and file errors, and tracks collapsed categories. */
export class BookmarkTreeView extends DisposableStore {
  private readonly provider: BookmarkTreeProvider;
  private readonly view: vscode.TreeView<TreeNode>;

  constructor(
    private readonly store: BookmarkStore,
    private readonly collapseState: CollapseState,
  ) {
    super();
    this.provider = this.register(new BookmarkTreeProvider(store, collapseState));
    this.view = this.register(
      vscode.window.createTreeView(VIEW_ID, {
        treeDataProvider: this.provider,
        showCollapseAll: true,
      }),
    );
    this.register(this.view.onDidCollapseElement((e) => this.remember(e.element, true)));
    this.register(this.view.onDidExpandElement((e) => this.remember(e.element, false)));
    this.register(store.onDidChange(() => this.refresh()));
    this.register(vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh()));
    this.refresh();
  }

  get selected(): TreeNode | undefined {
    return this.view.selection[0];
  }

  private refresh(): void {
    const { error } = this.store;
    this.view.message = error && `⚠ ${error}`;
    setContext(ContextKeys.fileError, !!error);
    this.provider.refresh();
  }

  private remember(node: TreeNode, collapsed: boolean): void {
    if (node instanceof BookmarkGroup) {
      this.collapseState.set(node.title, collapsed);
    }
  }
}
