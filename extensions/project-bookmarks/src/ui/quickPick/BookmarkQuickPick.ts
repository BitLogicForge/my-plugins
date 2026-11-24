import * as vscode from 'vscode';
import type { BookmarkActions } from '../../commands/BookmarkActions';
import { CurrentProject } from '../../project/CurrentProject';
import type { BookmarkStore } from '../../store/BookmarkStore';
import { BookmarkItem, buildItems, Buttons } from './items';

/** The bookmark list opened from the status bar. */
export class BookmarkQuickPick {
  constructor(
    private readonly store: BookmarkStore,
    private readonly actions: BookmarkActions,
  ) {}

  show(): void {
    const qp = vscode.window.createQuickPick<BookmarkItem>();
    qp.title = 'Project Bookmarks';
    qp.placeholder = 'Enter: open here · window button: open in new window';
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;
    qp.items = this.items();

    qp.onDidAccept(async () => {
      const item = qp.selectedItems[0];
      if (!item) {
        return;
      }
      qp.hide();
      if (item.action === 'add') {
        await this.actions.addCurrent();
      } else if (item.bookmark) {
        this.actions.open(item.bookmark, false);
      }
    });

    qp.onDidTriggerItemButton(async ({ item, button }) => {
      const bookmark = item.bookmark;
      if (!bookmark) {
        return;
      }
      if (button === Buttons.newWindow) {
        qp.hide();
        this.actions.open(bookmark, true);
      } else if (button === Buttons.remove) {
        await this.actions.remove(bookmark);
        qp.items = this.items();
      } else if (button === Buttons.rename) {
        qp.hide(); // the input box replaces the quick pick
        await this.actions.rename(bookmark);
        this.show();
      }
    });

    qp.onDidHide(() => qp.dispose());
    qp.show();
  }

  private items(): BookmarkItem[] {
    const project = CurrentProject.get();
    const canAdd = !!project && !this.store.find(project.key);
    return buildItems(this.store.list, canAdd);
  }
}
