import * as vscode from 'vscode';
import type { Snippet } from '../snippets/model';
import { normalizeName } from '../util/text';
import { EditorContext } from './EditorContext';
import type { PickItem } from './pickers';
import { VariableRegistry } from './VariableRegistry';

// `{{name}}` or `{{name=default}}` / `{{name=a|b|c}}`; `\{{` is a literal `{{`.
const VAR_RE = /(?<!\\)\{\{\s*([^{}=]+?)\s*(?:=([^{}]*))?\}\}/g;

interface Placeholder {
  key: string;
  name: string;
  defaultValue?: string;
}

/** A value the user has to provide: from a list, or typed. */
interface Question extends Placeholder {
  items?: PickItem[];
  /** A built-in variable that has no value here. */
  missing?: boolean;
}

/** Replaces the `{{variables}}` in a snippet body, asking the user where needed. */
export class TemplateExpander {
  constructor(private readonly registry: VariableRegistry) {}

  /** Returns the final text, or undefined if the user cancels a prompt. */
  async expand(snippet: Snippet): Promise<string | undefined> {
    const ctx = new EditorContext();
    const values = new Map<string, string>();
    const questions: Question[] = [];

    for (const p of this.placeholders(snippet.body)) {
      const picker = this.registry.picker(p.name);
      if (picker) {
        const items = await picker(ctx);
        questions.push({ ...p, items: items.length ? items : undefined, missing: !items.length });
        continue;
      }
      const resolve = this.registry.value(p.name);
      const value = resolve ? await resolve(ctx) : undefined;
      if (value !== undefined) {
        values.set(p.key, value);
      } else {
        questions.push({ ...p, missing: !!resolve });
      }
    }

    for (const [i, q] of questions.entries()) {
      const step = questions.length > 1 ? ` (${i + 1}/${questions.length})` : '';
      const answer = await this.ask(q, `${snippet.name}${step}`);
      if (answer === undefined) {
        return undefined;
      }
      values.set(q.key, answer);
    }

    return snippet.body
      .replace(VAR_RE, (_, name: string) => values.get(normalizeName(name)) ?? '')
      .replace(/\\\{\{/g, '{{')
      .replace(/\s+$/, '');
  }

  /** Unique placeholders in order; a later one with a default fills in a missing default. */
  private placeholders(body: string): Placeholder[] {
    const found = new Map<string, Placeholder>();
    for (const m of body.matchAll(VAR_RE)) {
      const key = normalizeName(m[1]);
      const prev = found.get(key);
      if (!prev || (prev.defaultValue === undefined && m[2] !== undefined)) {
        found.set(key, { key, name: m[1], defaultValue: m[2] });
      }
    }
    return [...found.values()];
  }

  private async ask(q: Question, title: string): Promise<string | undefined> {
    if (q.items) {
      const picked = await vscode.window.showQuickPick(q.items, {
        title,
        placeHolder: q.name,
        matchOnDescription: true,
        ignoreFocusOut: true,
      });
      return picked?.value;
    }
    if (!q.missing && q.defaultValue?.includes('|')) {
      return vscode.window.showQuickPick(q.defaultValue.split('|'), {
        title,
        placeHolder: q.name,
        ignoreFocusOut: true,
      });
    }
    return vscode.window.showInputBox({
      title,
      prompt: q.missing ? `${q.name} (could not be detected here)` : q.name,
      value: q.defaultValue,
      ignoreFocusOut: true,
    });
  }
}
