import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('__DISPLAY_NAME__', { log: true });
  log.info('__DISPLAY_NAME__ activated');

  context.subscriptions.push(
    log,
    vscode.commands.registerCommand('__COMMAND_PREFIX__.helloWorld', () => {
      log.info('Hello World command ran');
      void vscode.window.showInformationMessage('Hello from __DISPLAY_NAME__!');
    }),
  );
}

export function deactivate(): void {
  // Anything pushed to context.subscriptions is disposed automatically.
}
