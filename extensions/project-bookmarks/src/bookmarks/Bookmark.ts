import * as vscode from 'vscode';

/** One saved project. `uri` is the full folder/workspace URI, including the remote authority. */
export interface Bookmark {
  uri: string;
  label: string;
  /** Set by editing the bookmarks file. Missing or blank means "no category". */
  category?: string;
  /** true when `uri` points at a .code-workspace file rather than a folder. */
  isWorkspaceFile?: boolean;
}

/** The file is edited by hand, so check every entry before using it. */
export function isBookmark(value: unknown): value is Bookmark {
  const b = value as Partial<Bookmark> | null | undefined;
  if (typeof b?.uri !== 'string' || typeof b.label !== 'string') {
    return false;
  }
  if (b.category !== undefined && typeof b.category !== 'string') {
    return false;
  }
  try {
    vscode.Uri.parse(b.uri);
    return true;
  } catch {
    return false;
  }
}
