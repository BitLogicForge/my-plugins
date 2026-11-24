import type * as vscode from 'vscode';

/** Remote kind from the authority, e.g. "dev-container+7b22…" → "dev-container". */
function remoteKind(uri: vscode.Uri): string | undefined {
  return uri.scheme === 'vscode-remote' ? uri.authority.split('+')[0] : undefined;
}

export function locationName(uri: vscode.Uri): string {
  const kind = remoteKind(uri);
  const arg = decode(uri.authority.split('+')[1] ?? '');
  switch (kind) {
    case undefined:
      return uri.scheme === 'file' ? 'Local' : uri.scheme;
    case 'dev-container':
    case 'attached-container':
      return 'Dev Container';
    case 'wsl':
      return arg ? `WSL: ${arg}` : 'WSL';
    case 'ssh-remote':
      return arg ? `SSH: ${arg}` : 'SSH';
    case 'tunnel':
      return arg ? `Tunnel: ${arg}` : 'Tunnel';
    case 'codespaces':
      return 'Codespaces';
    default:
      return kind;
  }
}

export function locationIcon(uri: vscode.Uri): string {
  switch (remoteKind(uri)) {
    case undefined:
      return 'folder';
    case 'dev-container':
    case 'attached-container':
      return 'vm';
    case 'wsl':
      return 'terminal-linux';
    default:
      return 'remote';
  }
}

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
