import type { GitState } from '../git/GitState';
import type { Snippet } from './model';

/** A heading with its snippets, as shown in the list and the sidebar. */
export interface SnippetGroup {
  readonly title: string;
  /** The group of snippets whose "when" matches the current git state. */
  readonly pinned: boolean;
  readonly snippets: readonly Snippet[];
}

type Placement = 'normal' | 'pinned' | 'hidden';

/** Where a snippet goes: pinned when its "when" matches, hidden when it does not. */
function placement(s: Snippet, state: GitState | undefined): Placement {
  if (!s.when) {
    return 'normal';
  }
  if (state && s.when.some((w) => state.matches(w))) {
    return 'pinned';
  }
  return s.when.includes('idle') && !state?.operation ? 'normal' : 'hidden';
}

/** Groups snippets: pinned first (titled with the git state), then one group per category. */
export function groupSnippets(
  snippets: readonly Snippet[],
  state: GitState | undefined,
): SnippetGroup[] {
  const pinned: Snippet[] = [];
  const byCategory = new Map<string, Snippet[]>();
  for (const s of snippets) {
    const p = placement(s, state);
    if (p === 'pinned') {
      pinned.push(s);
    } else if (p === 'normal') {
      byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);
    }
  }
  const groups: SnippetGroup[] = [...byCategory].map(([title, list]) => ({
    title,
    pinned: false,
    snippets: list,
  }));
  if (pinned.length) {
    groups.unshift({ title: state?.operationText ?? 'Now', pinned: true, snippets: pinned });
  }
  return groups;
}
