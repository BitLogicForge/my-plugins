import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Snippet Shelf', () => {
  test('activates', async () => {
    const ext = vscode.extensions.getExtension('local.snippet-shelf');
    assert.ok(ext, 'extension not found');
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('registers the show command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('snippetShelf.show'));
  });
});
