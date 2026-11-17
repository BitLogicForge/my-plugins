import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as jsonc from 'jsonc-parser';
import * as vscode from 'vscode';
import { Action, ACTIONS, Snippet, WHEN_VALUES } from '../snippets/model';
import { SEED } from './seed';

const FORMATTING: jsonc.FormattingOptions = { insertSpaces: true, tabSize: 2, eol: '\n' };

/** A snippet as written in the file, for adding new ones. */
export interface SnippetEntry {
  name: string;
  body: string | string[];
  action?: Action;
}

/**
 * The snippets file (~/.snippet-shelf.jsonc). Keys are categories, values are snippet lists.
 *
 * This extension is `extensionKind: ["ui"]`, so it runs in the local VS Code and this is the
 * local home folder: one file shared by every window (local, WSL, dev containers, SSH) and every
 * VS Code profile. Edits go through jsonc-parser so the user's comments and formatting are kept.
 */
export class SnippetStore implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<void>();
  /** Fires when the file changes (here, in another window, or by an edit from this class). */
  readonly onDidChange = this.emitter.event;
  private readonly onFileChange = () => this.emitter.fire();

  constructor(readonly file = path.join(os.homedir(), '.snippet-shelf.jsonc')) {
    fs.watchFile(this.file, { interval: 1000 }, this.onFileChange);
  }

  dispose(): void {
    fs.unwatchFile(this.file, this.onFileChange);
    this.emitter.dispose();
  }

  /** Reads and validates the file (creating it from the examples if missing). Undefined on errors. */
  async load(): Promise<Snippet[] | undefined> {
    let text: string;
    try {
      text = await fs.promises.readFile(this.file, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        void this.showError(`cannot read the snippets file: ${(err as Error).message}`);
        return undefined;
      }
      text = SEED;
      await this.write(SEED);
    }

    const data = this.parse(text);
    if (!data) {
      return undefined;
    }
    const snippets: Snippet[] = [];
    const problems: string[] = [];
    for (const [category, list] of Object.entries(data)) {
      if (category === '$schema') {
        continue;
      }
      if (!Array.isArray(list)) {
        problems.push(`"${category}" is not a list`);
        continue;
      }
      list.forEach((raw: Record<string, unknown>, index) => {
        const snippet = toSnippet(raw, category, index);
        if (snippet) {
          snippets.push(snippet);
        } else {
          problems.push(`"${category}" item ${index + 1} needs "name" and "body"`);
        }
      });
    }
    if (problems.length) {
      void this.showError(`skipped invalid entries: ${problems.join('; ')}.`);
    }
    return snippets;
  }

  /** Opens the file in an editor (creating it if missing). */
  async open(): Promise<vscode.TextEditor> {
    if (!fs.existsSync(this.file)) {
      await this.write(SEED);
    }
    return vscode.window.showTextDocument(vscode.Uri.file(this.file));
  }

  /** Opens the file with the cursor on the given snippet. */
  async reveal(snippet: Snippet): Promise<void> {
    const editor = await this.open();
    const root = jsonc.parseTree(editor.document.getText());
    const node = root && jsonc.findNodeAtLocation(root, [snippet.category, snippet.index]);
    if (node) {
      const start = editor.document.positionAt(node.offset);
      const end = editor.document.positionAt(node.offset + node.length);
      editor.selection = new vscode.Selection(start, start);
      editor.revealRange(
        new vscode.Range(start, end),
        vscode.TextEditorRevealType.InCenterIfOutsideViewport,
      );
    }
  }

  /** Appends a snippet to a category, creating the category if needed. */
  async append(category: string, entry: SnippetEntry): Promise<void> {
    let text = await fs.promises.readFile(this.file, 'utf8');
    text = appendEntry(text, category, entry, this.parse(text)?.[category] !== undefined);
    await this.write(text);
  }

  /** Adds the example snippets the file does not have yet (matched by name). Returns the count. */
  async addExamples(): Promise<number | undefined> {
    if (!fs.existsSync(this.file)) {
      await this.write(SEED);
      return Object.values(jsonc.parse(SEED) as Record<string, unknown[]>).flat().length;
    }
    let text = await fs.promises.readFile(this.file, 'utf8');
    const mine = this.parse(text);
    if (!mine) {
      return undefined;
    }
    const examples = jsonc.parse(SEED) as Record<string, (SnippetEntry & { name: string })[]>;
    let added = 0;
    for (const [category, list] of Object.entries(examples)) {
      const existing = mine[category];
      if (existing === undefined) {
        text = jsonc.applyEdits(
          text,
          jsonc.modify(text, [category], list, { formattingOptions: FORMATTING }),
        );
        added += list.length;
      } else if (Array.isArray(existing)) {
        for (const entry of list) {
          if (!existing.some((e: { name?: unknown }) => e?.name === entry.name)) {
            text = appendEntry(text, category, entry, true);
            added++;
          }
        }
      } // else: not a list; leave the user's value alone
    }
    if (added) {
      await this.write(text);
    }
    return added;
  }

  /** Parses the file text; shows an error and returns undefined if it is not a valid object. */
  private parse(text: string): Record<string, unknown> | undefined {
    const errors: jsonc.ParseError[] = [];
    const data: unknown = jsonc.parse(text, errors, { allowTrailingComma: true });
    if (errors.length) {
      const e = errors[0];
      const line = text.slice(0, e.offset).split('\n').length;
      void this.showError(`syntax error on line ${line} (${jsonc.printParseErrorCode(e.error)}).`);
      return undefined;
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      void this.showError('the file must contain an object whose keys are categories.');
      return undefined;
    }
    return data as Record<string, unknown>;
  }

  /** Writes via a temp file + rename, so another window never reads a half-written file. */
  private async write(text: string): Promise<void> {
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, text);
    await fs.promises.rename(tmp, this.file);
  }

  private async showError(message: string): Promise<void> {
    const open = 'Open File';
    if ((await vscode.window.showErrorMessage(`Snippet Shelf: ${message}`, open)) === open) {
      await this.open();
    }
  }
}

function appendEntry(
  text: string,
  category: string,
  entry: SnippetEntry,
  categoryExists: boolean,
): string {
  const edits = categoryExists
    ? jsonc.modify(text, [category, -1], entry, {
        formattingOptions: FORMATTING,
        isArrayInsertion: true,
      })
    : jsonc.modify(text, [category], [entry], { formattingOptions: FORMATTING });
  return jsonc.applyEdits(text, edits);
}

/** Validates one raw entry from the file. */
function toSnippet(
  raw: Record<string, unknown>,
  category: string,
  index: number,
): Snippet | undefined {
  const body = Array.isArray(raw?.body) ? raw.body.join('\n') : raw?.body;
  if (typeof raw?.name !== 'string' || typeof body !== 'string') {
    return undefined;
  }
  const whenRaw = typeof raw.when === 'string' ? [raw.when] : raw.when;
  const when = Array.isArray(whenRaw)
    ? whenRaw.filter((w): w is string => typeof w === 'string' && WHEN_VALUES.includes(w))
    : [];
  return {
    name: raw.name,
    category,
    description: typeof raw.description === 'string' ? raw.description : undefined,
    body,
    action: ACTIONS.includes(raw.action as Action) ? (raw.action as Action) : 'run',
    when: when.length ? when : undefined,
    index,
  };
}
