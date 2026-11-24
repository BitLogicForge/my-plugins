import type { Bookmark } from './Bookmark';

/** A category and its bookmarks. */
export class BookmarkGroup {
  readonly bookmarks: Bookmark[] = [];

  constructor(readonly title: string) {}
}

export interface GroupedBookmarks {
  groups: BookmarkGroup[];
  uncategorized: Bookmark[];
}

/** Groups by category. Categories and bookmarks keep the order they have in the file. */
export function groupBookmarks(list: readonly Bookmark[]): GroupedBookmarks {
  const groups = new Map<string, BookmarkGroup>();
  const uncategorized: Bookmark[] = [];
  for (const b of list) {
    const title = b.category?.trim();
    if (!title) {
      uncategorized.push(b);
      continue;
    }
    let group = groups.get(title);
    if (!group) {
      group = new BookmarkGroup(title);
      groups.set(title, group);
    }
    group.bookmarks.push(b);
  }
  return { groups: [...groups.values()], uncategorized };
}
