import * as vscode from 'vscode';
import type { GitState } from '../git/GitState';
import type { GitStateMonitor } from '../git/GitStateMonitor';
import { Action, ACTION_INFO, ACTIONS, otherActions, preview, Snippet } from '../snippets/model';
import { groupSnippets } from '../snippets/SnippetGroup';
import type { SnippetRunner } from '../snippets/SnippetRunner';
import type { SnippetStore } from '../store/SnippetStore';

type Item = vscode.QuickPickItem & { snippet?: Snippet; openFile?: boolean };

const ACTION_BUTTONS = Object.fromEntries(
  ACTIONS.map((a) => [
    a,
    { iconPath: new vscode.ThemeIcon(ACTION_INFO[a].icon), tooltip: ACTION_INFO[a].label },
  ]),
) as Record<Action, vscode.QuickInputButton>;

const EDIT_FILE_BUTTON: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('edit'),
  tooltip: 'Edit snippets file',
};

/** The searchable snippet list (status bar icon, terminal toolbar, "Show Snippets"). */
export class SnippetQuickPick {
  constructor(
    private readonly store: SnippetStore,
    private readonly runner: SnippetRunner,
    private readonly monitor: GitStateMonitor,
  ) {}

  /** Shows all snippets, or only one category. */
  async show(category?: string): Promise<void> {
    const [loaded, state] = await Promise.all([this.store.load(), this.monitor.refresh()]);
    if (!loaded) {
      return;
    }
    const wanted = category?.toLowerCase();
    const snippets = wanted ? loaded.filter((s) => s.category.toLowerCase() === wanted) : loaded;

    const qp = vscode.window.createQuickPick<Item>();
    qp.title = [
      category ? `Snippets: ${category}` : 'Snippets',
      ...(state?.summaryParts ?? []),
    ].join(' · ');
    qp.placeholder = 'Enter: default action (icon) · item buttons: other actions';
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;
    qp.buttons = [EDIT_FILE_BUTTON];
    qp.items = this.items(snippets, state);

    const finish = (fn: () => Promise<unknown>) => {
      qp.hide();
      void fn();
    };
    qp.onDidAccept(() => {
      const item = qp.selectedItems[0];
      if (item?.openFile) {
        finish(() => this.store.open());
      } else if (item?.snippet) {
        finish(() => this.runner.perform(item.snippet!));
      }
    });
    qp.onDidTriggerItemButton(({ item, button }) => {
      const action = ACTIONS.find((a) => ACTION_BUTTONS[a] === button);
      if (item.snippet && action) {
        finish(() => this.runner.perform(item.snippet!, action));
      }
    });
    qp.onDidTriggerButton((b) => b === EDIT_FILE_BUTTON && finish(() => this.store.open()));
    qp.onDidHide(() => qp.dispose());
    qp.show();
  }

  private items(snippets: readonly Snippet[], state: GitState | undefined): Item[] {
    const items: Item[] = [];
    for (const group of groupSnippets(snippets, state)) {
      items.push({
        label: group.pinned ? `⚠ ${group.title}` : group.title,
        kind: vscode.QuickPickItemKind.Separator,
      });
      for (const s of group.snippets) {
        items.push({
          label: s.name,
          iconPath: new vscode.ThemeIcon(ACTION_INFO[s.action].icon),
          description: [s.description, s.category].filter(Boolean).join(' · '),
          detail: preview(s.body),
          snippet: s,
          buttons: otherActions(s).map((a) => ACTION_BUTTONS[a]),
        });
      }
    }
    if (!items.length) {
      items.push({ label: '$(edit) No snippets yet. Edit the snippets file…', openFile: true });
    }
    return items;
  }
}
