import * as vscode from 'vscode';

/** Asks for a bookmark label. Undefined when cancelled. */
export async function askLabel(value: string): Promise<string | undefined> {
  const label = await vscode.window.showInputBox({
    title: 'Bookmark label',
    value,
    valueSelection: [0, value.length],
    validateInput: (v) => (v.trim() ? undefined : 'Label cannot be empty'),
  });
  return label?.trim();
}
