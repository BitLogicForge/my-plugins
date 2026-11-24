import * as vscode from 'vscode';
import type { Bookmark } from '../bookmarks/Bookmark';
import { CurrentProject } from '../project/CurrentProject';
import { locationIcon, locationName } from '../project/location';

/** How a bookmark looks; shared by the sidebar and the quick pick. */
export class BookmarkPresentation {
  readonly isCurrent: boolean;
  readonly icon: vscode.ThemeIcon;
  readonly description: string;
  readonly path: string;
  readonly tooltip: string;

  constructor(bookmark: Bookmark) {
    const uri = vscode.Uri.parse(bookmark.uri);
    const location = locationName(uri);
    this.isCurrent = bookmark.uri === CurrentProject.key;
    this.icon = new vscode.ThemeIcon(this.isCurrent ? 'check' : locationIcon(uri));
    this.description = this.isCurrent ? `${location} · current` : location;
    this.path = uri.path;
    this.tooltip = `${bookmark.label}\n${location}\n${uri.path}`;
  }
}
