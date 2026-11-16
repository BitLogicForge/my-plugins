import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('Hello World', { log: true });
  log.info('Hello World activated');

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('helloWorld.helloWorld', () => {
      log.info('Hello World command ran');
      void vscode.window.showInformationMessage('Hello from Hello World!');
    }),
  );
}

export function deactivate(): void {
  // Anything pushed to context.subscriptions is disposed automatically.
}
