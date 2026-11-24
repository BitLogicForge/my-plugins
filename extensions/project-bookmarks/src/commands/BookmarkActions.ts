import * as vscode from 'vscode';
import type { Bookmark } from '../bookmarks/Bookmark';
import { CurrentProject } from '../project/CurrentProject';
import type { BookmarkStore } from '../store/BookmarkStore';
import type { BookmarkFileEditor } from '../ui/BookmarkFileEditor';
import { askLabel } from '../ui/askLabel';

/** What can be done with bookmarks; used by the palette, the sidebar and the quick pick. */
export class BookmarkActions {
  constructor(
    private readonly store: BookmarkStore,
    private readonly fileEditor: BookmarkFileEditor,
  ) {}

  async addCurrent(): Promise<void> {
    const project = CurrentProject.get();
    if (!project) {
      void vscode.window.showWarningMessage('Open a folder or workspace first.');
      return;
    }
    const existing = this.store.find(project.key);
    if (existing) {
      await this.rename(existing);
    } else {
      await this.add(project);
    }
  }

  async removeCurrent(): Promise<void> {
    const bookmark = this.store.find(CurrentProject.key);
    if (bookmark) {
      await this.remove(bookmark);
    }
  }

  async rename(bookmark: Bookmark): Promise<void> {
    const label = await askLabel(bookmark.label);
    if (label !== undefined) {
      await this.save(() => this.store.rename(bookmark.uri, label));
    }
  }

  async remove(bookmark: Bookmark): Promise<void> {
    await this.save(() => this.store.remove(bookmark.uri));
  }

  open(bookmark: Bookmark, newWindow: boolean): void {
    if (bookmark.uri === CurrentProject.key) {
      return;
    }
    void vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(bookmark.uri), {
      forceNewWindow: newWindow,
    });
  }

  async edit(bookmark?: Bookmark): Promise<void> {
    await this.fileEditor.open(bookmark);
  }

  private async add(project: CurrentProject): Promise<void> {
    const label = await askLabel(project.defaultLabel);
    if (label === undefined) {
      return;
    }
    const bookmark: Bookmark = {
      uri: project.key,
      label,
      isWorkspaceFile: project.isWorkspaceFile,
    };
    if (!(await this.save(() => this.store.add(bookmark)))) {
      return;
    }
    if (await vscode.window.showInformationMessage(`Bookmarked "${label}".`, 'Edit in JSON')) {
      await this.edit(bookmark);
    }
  }

  /** Runs a store edit and reports a failure. Returns whether it was saved. */
  private async save(change: () => Promise<void>): Promise<boolean> {
    try {
      await change();
      return true;
    } catch (err) {
      const message = `Project Bookmarks: nothing was changed. ${(err as Error).message}`;
      void vscode.window
        .showErrorMessage(message, 'Open File')
        .then((choice) => choice && this.edit());
      return false;
    }
  }
}
