import * as vscode from 'vscode';
import { BookmarkActions } from './commands/BookmarkActions';
import { PaletteCommands } from './commands/PaletteCommands';
import { TreeCommands } from './commands/TreeCommands';
import { BookmarkFile } from './store/BookmarkFile';
import { BookmarkStore } from './store/BookmarkStore';
import { migrateFromGlobalState } from './store/migrateFromGlobalState';
import { BookmarkFileEditor } from './ui/BookmarkFileEditor';
import { BookmarkQuickPick } from './ui/quickPick/BookmarkQuickPick';
import { BookmarkTreeView } from './ui/sidebar/BookmarkTreeView';
import { CollapseState } from './ui/sidebar/CollapseState';
import { StatusIndicator } from './ui/statusBar/StatusIndicator';

// Composition root: builds the objects and wires them together. Logic lives in the modules:
//   bookmarks/  the model and grouping by category
//   store/      the bookmarks file and the in-memory list
//   project/    the project open in this window, and where a project lives (local, WSL, ...)
//   commands/   what can be done with bookmarks, and the commands that trigger it
//   ui/         sidebar, quick pick, status bar, file editor
//   util/       small shared helpers

export function activate(context: vscode.ExtensionContext): void {
  const file = new BookmarkFile();
  const store = new BookmarkStore(file);
  const actions = new BookmarkActions(store, new BookmarkFileEditor(file));
  const treeView = new BookmarkTreeView(store, new CollapseState(context.globalState));

  context.subscriptions.push(
    store,
    treeView,
    new StatusIndicator(store),
    new TreeCommands(treeView, actions),
    new PaletteCommands(actions, new BookmarkQuickPick(store, actions)),
  );

  migrateFromGlobalState(context.globalState, store).catch((err: Error) => {
    console.error('Project Bookmarks: migration failed, will retry on next start.', err);
  });
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
