import * as vscode from 'vscode';
import { CommandController } from './commands/CommandController';
import { GitStateMonitor } from './git/GitStateMonitor';
import { SnippetRunner } from './snippets/SnippetRunner';
import { SnippetStore } from './store/SnippetStore';
import { SnippetQuickPick } from './ui/SnippetQuickPick';
import { SnippetTreeView } from './ui/SnippetTreeView';
import { StatusIndicator } from './ui/StatusIndicator';
import { TemplateExpander } from './variables/TemplateExpander';
import { VariableRegistry } from './variables/VariableRegistry';

// Composition root: builds the objects and wires them together. Logic lives in the modules:
//   store/      the snippets file (load, edit, examples)
//   git/        reading .git (GitRepo), the state summary and its monitor
//   variables/  built-in values, pickers, and expanding {{...}} in a snippet
//   snippets/   the model, grouping, and performing actions (terminal, editor, clipboard, browser)
//   ui/         status bar, sidebar tree, quick pick
//   commands/   command palette / keybinding commands

export function activate(context: vscode.ExtensionContext): void {
  const store = new SnippetStore();
  const monitor = new GitStateMonitor();
  const registry = new VariableRegistry();
  const runner = new SnippetRunner(new TemplateExpander(registry));
  const quickPick = new SnippetQuickPick(store, runner, monitor);

  context.subscriptions.push(
    store,
    monitor,
    new StatusIndicator(monitor),
    new SnippetTreeView(store, runner, monitor),
    new CommandController(store, runner, quickPick, registry),
  );
}

export function deactivate(): void {
  // Everything is disposed through context.subscriptions.
}
