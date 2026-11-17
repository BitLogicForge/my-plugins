import * as vscode from 'vscode';

// Helpers over vscode.workspace.fs, so they work for remote (dev container, WSL, SSH) files too.

export async function readBytes(uri: vscode.Uri): Promise<Uint8Array | undefined> {
  try {
    return await vscode.workspace.fs.readFile(uri);
  } catch {
    return undefined;
  }
}

export async function readText(uri: vscode.Uri): Promise<string | undefined> {
  const bytes = await readBytes(uri);
  return bytes && new TextDecoder().decode(bytes);
}

export async function exists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}
