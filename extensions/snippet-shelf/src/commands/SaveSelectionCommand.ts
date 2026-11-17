import * as vscode from 'vscode';
import { Action, ACTION_INFO, ACTIONS } from '../snippets/model';
import type { SnippetEntry, SnippetStore } from '../store/SnippetStore';

const NEW_CATEGORY = '$(add) New category…';
const notEmpty = (v: string) => (v.trim() ? undefined : 'Name cannot be empty');

/** "Save Selection as Snippet": asks name, category and default action, then appends it. */
export class SaveSelectionCommand {
  constructor(private readonly store: SnippetStore) {}

  async execute(): Promise<void> {
    const body = this.selectedText();
    if (!body) {
      void vscode.window.showWarningMessage('Select some text first.');
      return;
    }
    const snippets = await this.store.load();
    if (!snippets) {
      return;
    }
    const name = (
      await vscode.window.showInputBox({
        title: 'Save as snippet (1/3)',
        prompt: 'Snippet name',
        validateInput: notEmpty,
      })
    )?.trim();
    const category =
      name && (await this.askCategory([...new Set(snippets.map((s) => s.category))]));
    const action = category && (await this.askAction());
    if (!name || !category || !action) {
      return;
    }

    const lines = body.replace(/\r\n/g, '\n').split('\n');
    const entry: SnippetEntry = { name, body: lines.length === 1 ? lines[0] : lines };
    if (action !== 'run') {
      entry.action = action;
    }
    await this.store.append(category, entry);

    const open = 'Open File';
    if (
      (await vscode.window.showInformationMessage(`Saved "${name}" in ${category}.`, open)) === open
    ) {
      await this.store.open();
    }
  }

  private selectedText(): string | undefined {
    const editor = vscode.window.activeTextEditor;
    return editor?.selections
      .map((s) => editor.document.getText(s))
      .filter(Boolean)
      .join('\n');
  }

  private async askCategory(existing: string[]): Promise<string | undefined> {
    const picked = await vscode.window.showQuickPick([...existing, NEW_CATEGORY], {
      title: 'Save as snippet (2/3)',
      placeHolder: 'Category',
    });
    if (picked !== NEW_CATEGORY) {
      return picked;
    }
    const typed = await vscode.window.showInputBox({
      title: 'Save as snippet (2/3)',
      prompt: 'New category name',
      validateInput: notEmpty,
    });
    return typed?.trim();
  }

  private async askAction(): Promise<Action | undefined> {
    const picked = await vscode.window.showQuickPick(
      ACTIONS.map((a) => ({
        label: `$(${ACTION_INFO[a].icon}) ${ACTION_INFO[a].label}`,
        action: a,
      })),
      { title: 'Save as snippet (3/3)', placeHolder: 'What should Enter do?' },
    );
    return picked?.action;
  }
}
