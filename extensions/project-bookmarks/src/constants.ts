/** Ids shared with package.json ("contributes"); keep both in sync. */
export const VIEW_ID = 'projectBookmarks.tree';
export const STATUS_ITEM_ID = 'projectBookmarks.status';

export const Commands = {
  show: 'projectBookmarks.show',
  addCurrent: 'projectBookmarks.addCurrent',
  removeCurrent: 'projectBookmarks.removeCurrent',
  openStorageFile: 'projectBookmarks.openStorageFile',
  treeOpen: 'projectBookmarks.tree.open',
  treeOpenNewWindow: 'projectBookmarks.tree.openNewWindow',
  treeRename: 'projectBookmarks.tree.rename',
  treeEdit: 'projectBookmarks.tree.edit',
  treeRemove: 'projectBookmarks.tree.remove',
} as const;

export const ContextKeys = {
  currentIsBookmarked: 'projectBookmarks.currentIsBookmarked',
  fileError: 'projectBookmarks.fileError',
} as const;

/** `viewItem` values that pick a tree item's buttons and menu. */
export const ItemContext = {
  category: 'category',
  bookmark: 'bookmark',
  currentBookmark: 'bookmarkCurrent',
} as const;
