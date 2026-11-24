import * as vscode from 'vscode';
import type { Bookmark } from '../../bookmarks/Bookmark';
import { groupBookmarks } from '../../bookmarks/BookmarkGroup';
import { BookmarkPresentation } from '../BookmarkPresentation';

export type BookmarkItem = vscode.QuickPickItem & { bookmark?: Bookmark; action?: 'add' };

export const Buttons = {
  newWindow: { iconPath: new vscode.ThemeIcon('empty-window'), tooltip: 'Open in new window' },
  rename: { iconPath: new vscode.ThemeIcon('edit'), tooltip: 'Rename' },
  remove: { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Remove bookmark' },
} satisfies Record<string, vscode.QuickInputButton>;

/** One section per category, then the bookmarks without a category. */
export function buildItems(list: readonly Bookmark[], canAddCurrent: boolean): BookmarkItem[] {
  const items: BookmarkItem[] = [];
  if (canAddCurrent) {
    items.push({ label: '$(add) Bookmark current project…', action: 'add', alwaysShow: true });
  }

  const { groups, uncategorized } = groupBookmarks(list);
  for (const group of groups) {
    items.push(...section(group.title, group.bookmarks));
  }
  if (uncategorized.length) {
    items.push(...section(groups.length ? 'No category' : 'Bookmarks', uncategorized));
  }

  if (!items.length) {
    items.push({ label: 'No bookmarks yet. Open a project and bookmark it.', alwaysShow: true });
  }
  return items;
}

function section(title: string, bookmarks: readonly Bookmark[]): BookmarkItem[] {
  return [
    { label: title, kind: vscode.QuickPickItemKind.Separator },
    ...bookmarks.map(bookmarkItem),
  ];
}

function bookmarkItem(bookmark: Bookmark): BookmarkItem {
  const look = new BookmarkPresentation(bookmark);
  const buttons = [Buttons.rename, Buttons.remove];
  return {
    label: bookmark.label,
    iconPath: look.icon,
    description: look.description,
    detail: look.path,
    bookmark,
    buttons: look.isCurrent ? buttons : [Buttons.newWindow, ...buttons],
  };
}
