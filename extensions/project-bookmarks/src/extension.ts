import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('Project Bookmarks', { log: true });
  log.info('Project Bookmarks activated');

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('projectBookmarks.helloWorld', () => {
      log.info('Hello World command ran');
      void vscode.window.showInformationMessage('Hello from Project Bookmarks!');
    }),
  );
}

export function deactivate(): void {
  // Anything pushed to context.subscriptions is disposed automatically.
}
