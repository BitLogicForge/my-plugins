import * as vscode from 'vscode';
import { Commands } from '../constants';
import type { BookmarkQuickPick } from '../ui/quickPick/BookmarkQuickPick';
import { DisposableStore } from '../util/DisposableStore';
import type { BookmarkActions } from './BookmarkActions';

/** The command palette commands. */
export class PaletteCommands extends DisposableStore {
  constructor(actions: BookmarkActions, quickPick: BookmarkQuickPick) {
    super();
    this.add(Commands.show, () => quickPick.show());
    this.add(Commands.addCurrent, () => actions.addCurrent());
    this.add(Commands.removeCurrent, () => actions.removeCurrent());
    this.add(Commands.openStorageFile, () => actions.edit());
  }

  private add(id: string, run: () => unknown): void {
    this.register(vscode.commands.registerCommand(id, run));
  }
}
