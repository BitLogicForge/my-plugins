import * as vscode from 'vscode';
import type { Bookmark } from '../bookmarks/Bookmark';
import type { BookmarkFile } from '../store/BookmarkFile';

/** Shows the bookmarks file in a text editor. */
export class BookmarkFileEditor {
  constructor(private readonly file: BookmarkFile) {}

  /** Opens the file (creating it if missing), at the given bookmark. */
  async open(bookmark?: Bookmark): Promise<void> {
    await this.file.ensureExists();
    const editor = await vscode.window.showTextDocument(vscode.Uri.file(this.file.path));
    if (bookmark) {
      this.reveal(editor, bookmark);
    }
  }

  private reveal(editor: vscode.TextEditor, bookmark: Bookmark): void {
    const offset = editor.document.getText().indexOf(JSON.stringify(bookmark.uri));
    if (offset < 0) {
      return;
    }
    const pos = editor.document.positionAt(offset);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}
