/** What Enter does with a snippet. */
export type Action = 'run' | 'paste' | 'insert' | 'copy' | 'open';
export const ACTIONS: readonly Action[] = ['run', 'paste', 'insert', 'copy', 'open'];

export const ACTION_INFO: Readonly<Record<Action, { icon: string; label: string }>> = {
  run: { icon: 'play', label: 'Run in terminal' },
  paste: { icon: 'terminal', label: 'Paste into terminal (don’t run)' },
  insert: { icon: 'insert', label: 'Insert into editor' },
  copy: { icon: 'copy', label: 'Copy' },
  open: { icon: 'link-external', label: 'Open in browser' },
};

/** Values allowed in a snippet's "when" (git states, see GitState). */
export const WHEN_VALUES: readonly string[] = [
  'rebase',
  'merge',
  'cherry-pick',
  'revert',
  'bisect',
  'am',
  'in-progress',
  'conflicts',
  'idle',
];

export interface Snippet {
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly body: string;
  readonly action: Action;
  /** Only show the snippet in these git states (see WHEN_VALUES). */
  readonly when?: readonly string[];
  /** Position inside its category's array in the file. */
  readonly index: number;
}

/** Actions offered as buttons besides the snippet's default one. */
export function otherActions(s: Snippet): Action[] {
  const pool: Action[] = s.action === 'open' ? ['copy'] : ['run', 'paste', 'insert', 'copy'];
  return pool.filter((a) => a !== s.action);
}

/** One-line preview of a snippet body. */
export function preview(body: string): string {
  const text = body
    .split('\n')
    .filter((l) => l.trim())
    .join('  ⏎  ');
  return text.length > 160 ? text.slice(0, 157) + '…' : text;
}
