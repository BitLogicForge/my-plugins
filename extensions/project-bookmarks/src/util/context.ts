import * as vscode from 'vscode';

/** Sets a context key used by the "when" clauses in package.json. */
export function setContext(key: string, value: boolean): void {
  void vscode.commands.executeCommand('setContext', key, value);
}
