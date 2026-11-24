import * as vscode from 'vscode';
import { BookmarkGroup } from '../bookmarks/BookmarkGroup';
import type { Bookmark } from '../bookmarks/Bookmark';
import { Commands } from '../constants';
import type { BookmarkTreeView } from '../ui/sidebar/BookmarkTreeView';
import type { TreeNode } from '../ui/sidebar/BookmarkTreeProvider';
import { DisposableStore } from '../util/DisposableStore';
import type { BookmarkActions } from './BookmarkActions';

/** The buttons, context menu and Enter key of the sidebar items. */
export class TreeCommands extends DisposableStore {
  constructor(
    private readonly view: BookmarkTreeView,
    actions: BookmarkActions,
  ) {
    super();
    this.add(Commands.treeOpen, (b) => actions.open(b, false));
    this.add(Commands.treeOpenNewWindow, (b) => actions.open(b, true));
    this.add(Commands.treeRename, (b) => actions.rename(b));
    this.add(Commands.treeEdit, (b) => actions.edit(b));
    this.add(Commands.treeRemove, (b) => actions.remove(b));
  }

  /** Runs on the clicked node, or on the selection when invoked by keybinding. */
  private add(id: string, run: (bookmark: Bookmark) => unknown): void {
    this.register(
      vscode.commands.registerCommand(id, (node?: TreeNode) => {
        const target = node ?? this.view.selected;
        if (target instanceof BookmarkGroup) {
          // Enter on a category: keep the normal collapse/expand behavior.
          return vscode.commands.executeCommand('list.toggleExpand');
        }
        return target && run(target);
      }),
    );
  }
}
