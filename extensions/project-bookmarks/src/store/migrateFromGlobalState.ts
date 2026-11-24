import type * as vscode from 'vscode';
import type { Bookmark } from '../bookmarks/Bookmark';
import type { BookmarkStore } from './BookmarkStore';

const LEGACY_STATE_KEY = 'bookmarks';

/** 0.0.1 kept bookmarks in (per-profile) globalState; merge them into the file once. */
export async function migrateFromGlobalState(
  state: vscode.Memento,
  store: BookmarkStore,
): Promise<void> {
  const old = state.get<Bookmark[]>(LEGACY_STATE_KEY);
  if (!old?.length) {
    return;
  }
  const added = old.filter((b) => !store.find(b.uri));
  if (added.length) {
    await store.add(...added);
  }
  await state.update(LEGACY_STATE_KEY, undefined);
}
