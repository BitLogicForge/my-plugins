import * as assert from 'node:assert';
import * as vscode from 'vscode';

suite('Project Bookmarks', () => {
  test('activates', async () => {
    const ext = vscode.extensions.getExtension('local.project-bookmarks');
    assert.ok(ext, 'extension not found');
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('registers the hello command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('projectBookmarks.helloWorld'));
  });
});
