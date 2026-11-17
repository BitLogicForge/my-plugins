import * as vscode from 'vscode';
import type { TemplateExpander } from '../variables/TemplateExpander';
import type { Action, Snippet } from './model';

const TERMINAL_WAIT_MS = 5000;
const CLIPBOARD_RESTORE_MS = 500;

/** Expands a snippet's variables and performs an action with the result. */
export class SnippetRunner {
  constructor(private readonly expander: TemplateExpander) {}

  async perform(snippet: Snippet, action: Action = snippet.action): Promise<void> {
    const text = await this.expander.expand(snippet);
    if (text === undefined) {
      return; // cancelled
    }
    switch (action) {
      case 'copy':
        await vscode.env.clipboard.writeText(text);
        vscode.window.setStatusBarMessage(`$(copy) Copied "${snippet.name}"`, 3000);
        return;
      case 'open':
        return this.openUrl(text);
      case 'insert':
        return this.insert(text);
      case 'run':
      case 'paste':
        return this.sendToTerminal(text, action === 'run');
    }
  }

  private async openUrl(text: string): Promise<void> {
    const url = text.split('\n')[0].trim();
    if (!/^[a-z][\w+.-]*:\/\//i.test(url)) {
      void vscode.window.showErrorMessage(`Snippet Shelf: not a URL: ${url}`);
      return;
    }
    await vscode.env.openExternal(vscode.Uri.parse(url, true));
  }

  private async insert(text: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      await vscode.env.clipboard.writeText(text);
      void vscode.window.showInformationMessage('No active editor; the snippet was copied.');
      return;
    }
    await editor.edit((eb) => editor.selections.forEach((s) => eb.replace(s, text)));
  }

  private async sendToTerminal(text: string, execute: boolean): Promise<void> {
    const terminal = await this.activeTerminal();
    if (!terminal) {
      void vscode.window.showErrorMessage('Snippet Shelf: could not open a terminal.');
      return;
    }
    terminal.show();
    if (execute || !text.includes('\n')) {
      terminal.sendText(text, execute);
      return;
    }
    // Multi-line without running: go through the terminal's paste, which uses bracketed paste
    // so the shell does not execute each line. Restore the clipboard afterwards.
    const saved = await vscode.env.clipboard.readText();
    await vscode.env.clipboard.writeText(text);
    await vscode.commands.executeCommand('workbench.action.terminal.paste');
    setTimeout(() => void vscode.env.clipboard.writeText(saved), CLIPBOARD_RESTORE_MS);
  }

  /** The active terminal, or a new one in the window's default location. */
  private async activeTerminal(): Promise<vscode.Terminal | undefined> {
    if (vscode.window.activeTerminal) {
      return vscode.window.activeTerminal;
    }
    // Use the built-in command rather than createTerminal(): from a UI extension, createTerminal()
    // would open a *local* shell even in a dev container / WSL / SSH window.
    const opened = new Promise<vscode.Terminal | undefined>((resolve) => {
      const sub = vscode.window.onDidOpenTerminal((t) => {
        sub.dispose();
        resolve(t);
      });
      setTimeout(() => {
        sub.dispose();
        resolve(undefined);
      }, TERMINAL_WAIT_MS);
    });
    await vscode.commands.executeCommand('workbench.action.terminal.new');
    return vscode.window.activeTerminal ?? (await opened);
  }
}
