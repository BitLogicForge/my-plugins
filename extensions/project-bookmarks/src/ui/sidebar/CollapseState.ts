import type * as vscode from 'vscode';

const STATE_KEY = 'collapsedCategories';

/** Remembers which categories are collapsed, across windows and restarts. */
export class CollapseState {
  constructor(private readonly state: vscode.Memento) {}

  isCollapsed(category: string): boolean {
    return this.collapsed.includes(category);
  }

  set(category: string, collapsed: boolean): void {
    const others = this.collapsed.filter((c) => c !== category);
    void this.state.update(STATE_KEY, collapsed ? [...others, category] : others);
  }

  private get collapsed(): string[] {
    return this.state.get<string[]>(STATE_KEY, []);
  }
}
