import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type * as vscode from 'vscode';

const POLL_INTERVAL_MS = 1000;

/**
 * Reads, writes and watches ~/.vscode-project-bookmarks.json. Knows JSON, not bookmarks.
 *
 * This extension is `extensionKind: ["ui"]`, so it runs in the local VS Code and this is the local
 * home folder: one file shared by every window (local, WSL, dev containers) and every profile.
 */
export class BookmarkFile {
  constructor(readonly path = defaultPath()) {}

  /** Raw entries, or none if the file does not exist. Throws if it cannot be read or parsed. */
  read(): unknown[] {
    let text: string;
    try {
      text = fs.readFileSync(this.path, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw err;
    }
    const data: unknown = JSON.parse(text.replace(/^\uFEFF/, ''));
    if (!Array.isArray(data)) {
      throw new Error('it must contain a JSON array');
    }
    return data;
  }

  /** Writes a temp file and renames it, so another window never reads a half-written file. */
  async write(entries: readonly unknown[]): Promise<void> {
    const tmp = `${this.path}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(entries, null, 2) + '\n');
    await fs.promises.rename(tmp, this.path);
  }

  async ensureExists(): Promise<void> {
    if (!fs.existsSync(this.path)) {
      await this.write([]);
    }
  }

  watch(listener: () => void): vscode.Disposable {
    const onChange = () => listener();
    fs.watchFile(this.path, { interval: POLL_INTERVAL_MS }, onChange);
    return { dispose: () => fs.unwatchFile(this.path, onChange) };
  }
}

function defaultPath(): string {
  return path.join(os.homedir(), '.vscode-project-bookmarks.json');
}
