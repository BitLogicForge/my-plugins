import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Hello World', () => {
  test('activates', async () => {
    const ext = vscode.extensions.getExtension('local.hello-world');
    assert.ok(ext, 'extension not found');
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('registers the hello command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('helloWorld.helloWorld'));
  });
});
