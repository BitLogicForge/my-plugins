import * as vscode from 'vscode';
import { Commands, ContextKeys, STATUS_ITEM_ID } from '../../constants';
import { CurrentProject } from '../../project/CurrentProject';
import type { BookmarkStore } from '../../store/BookmarkStore';
import { setContext } from '../../util/context';
import { DisposableStore } from '../../util/DisposableStore';

/** The status bar icon and the "current project is bookmarked" context key. */
export class StatusIndicator extends DisposableStore {
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly store: BookmarkStore) {
    super();
    this.item = this.register(
      vscode.window.createStatusBarItem(STATUS_ITEM_ID, vscode.StatusBarAlignment.Left, 0),
    );
    this.item.name = 'Project Bookmarks';
    this.item.text = '$(bookmark)';
    this.item.command = Commands.show;
    this.item.show();

    this.register(store.onDidChange(() => this.refresh()));
    this.register(vscode.workspace.onDidChangeWorkspaceFolders(() => this.refresh()));
    this.refresh();
  }

  private refresh(): void {
    const bookmark = this.store.find(CurrentProject.key);
    setContext(ContextKeys.currentIsBookmarked, !!bookmark);
    this.item.tooltip = bookmark
      ? `Project Bookmarks: this project is bookmarked as "${bookmark.label}"`
      : 'Project Bookmarks';
  }
}
