import * as vscode from 'vscode';
import { EditorContext } from '../variables/EditorContext';
import type { VariableRegistry } from '../variables/VariableRegistry';

type Item = vscode.QuickPickItem & { value?: string };

const SAMPLE_SIZE = 5;

/** "Show Variable Values": every variable with its current value; Enter copies it. */
export class ShowVariablesCommand {
  constructor(private readonly registry: VariableRegistry) {}

  async execute(): Promise<void> {
    const ctx = new EditorContext();
    const [values, pickers] = await Promise.all([this.valueItems(ctx), this.pickerItems(ctx)]);
    const picked = await vscode.window.showQuickPick<Item>(
      [
        { label: 'Values', kind: vscode.QuickPickItemKind.Separator },
        ...values,
        { label: 'Pickers', kind: vscode.QuickPickItemKind.Separator },
        ...pickers,
      ],
      { title: 'Snippet Shelf variables (Enter copies the value)', matchOnDescription: true },
    );
    if (picked?.value !== undefined) {
      await vscode.env.clipboard.writeText(picked.value);
    }
  }

  private valueItems(ctx: EditorContext): Promise<Item[]> {
    return Promise.all(
      Object.entries(this.registry.values).map(async ([name, resolve]) => {
        const value = await resolve(ctx);
        return {
          label: `{{${name}}}`,
          description: value ?? '(not available here; will be asked)',
          value,
        };
      }),
    );
  }

  private pickerItems(ctx: EditorContext): Promise<Item[]> {
    return Promise.all(
      Object.entries(this.registry.pickers).map(async ([name, list]) => {
        const items = await list(ctx);
        const sample = items.slice(0, SAMPLE_SIZE).map((i) => i.label);
        const more = items.length > SAMPLE_SIZE ? ', …' : '';
        return {
          label: `{{${name}}}`,
          description: items.length
            ? `pick from ${items.length}: ${sample.join(', ')}${more}`
            : '(nothing to pick here; will be asked)',
        };
      }),
    );
  }
}
