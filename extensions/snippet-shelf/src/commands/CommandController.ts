import * as vscode from 'vscode';
import { Action, ACTIONS } from '../snippets/model';
import type { SnippetRunner } from '../snippets/SnippetRunner';
import type { SnippetStore } from '../store/SnippetStore';
import type { SnippetQuickPick } from '../ui/SnippetQuickPick';
import type { VariableRegistry } from '../variables/VariableRegistry';
import { SaveSelectionCommand } from './SaveSelectionCommand';
import { ShowVariablesCommand } from './ShowVariablesCommand';

/** Arguments for keybindings, e.g. { "name": "Push current branch" } or { "category": "Git" }. */
interface CommandArgs {
  name?: string;
  category?: string;
  action?: Action;
}

/** Registers the command palette / keybinding commands (tree commands live in SnippetTreeView). */
export class CommandController implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[];

  constructor(
    private readonly store: SnippetStore,
    private readonly runner: SnippetRunner,
    private readonly quickPick: SnippetQuickPick,
    registry: VariableRegistry,
  ) {
    const saveSelection = new SaveSelectionCommand(store);
    const showVariables = new ShowVariablesCommand(registry);
    const register = vscode.commands.registerCommand;
    this.disposables = [
      register('snippetShelf.show', (args?: CommandArgs) => this.quickPick.show(category(args))),
      register('snippetShelf.run', (args?: CommandArgs) => this.runByName(args)),
      register('snippetShelf.openFile', () => this.store.open()),
      register('snippetShelf.addFromSelection', () => saveSelection.execute()),
      register('snippetShelf.showVariables', () => showVariables.execute()),
      register('snippetShelf.addExamples', () => this.addExamples()),
    ];
  }

  /** Runs one snippet by name (for keybindings); without a name, shows the list. */
  private async runByName(args?: CommandArgs): Promise<void> {
    if (!args?.name) {
      return this.quickPick.show(category(args));
    }
    const snippets = await this.store.load();
    const snippet = snippets?.find(
      (s) => s.name === args.name && (!args.category || s.category === args.category),
    );
    if (!snippet) {
      if (snippets) {
        void vscode.window.showErrorMessage(`Snippet Shelf: no snippet named "${args.name}".`);
      }
      return;
    }
    const action = args.action && ACTIONS.includes(args.action) ? args.action : undefined;
    await this.runner.perform(snippet, action);
  }

  private async addExamples(): Promise<void> {
    const added = await this.store.addExamples();
    if (added === undefined) {
      return; // the file does not parse; the store already said so
    }
    if (!added) {
      void vscode.window.showInformationMessage('You already have all example snippets.');
      return;
    }
    const open = 'Open File';
    const msg = `Added ${added} example snippet${added === 1 ? '' : 's'}.`;
    if ((await vscode.window.showInformationMessage(msg, open)) === open) {
      await this.store.open();
    }
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}

/** Menus pass other objects as the first argument; only accept a real category string. */
function category(args: CommandArgs | undefined): string | undefined {
  return typeof args?.category === 'string' ? args.category : undefined;
}
