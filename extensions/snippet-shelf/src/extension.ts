import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as jsonc from 'jsonc-parser';
import * as vscode from 'vscode';

// ---------- model ----------

type Action = 'run' | 'paste' | 'insert' | 'copy';
const ACTIONS: Action[] = ['run', 'paste', 'insert', 'copy'];

interface Snippet {
  name: string;
  category: string;
  description?: string;
  body: string;
  action: Action;
  /** Position inside its category's array in the file. */
  index: number;
}

// This extension is `extensionKind: ["ui"]`, so it runs in the local VS Code, not inside the
// container. Snippets live in one JSONC file in the local home folder, shared by every window
// (local, WSL, dev containers, SSH) and every VS Code profile.
const STORAGE_FILE = path.join(os.homedir(), '.snippet-shelf.jsonc');

const SEED = `// Snippet Shelf: your snippets. Keys are categories, values are lists of snippets.
//
//   name         shown in the list
//   body         a string, or an array of lines
//   description  optional
//   action       "run" (default: send to terminal and run), "paste" (terminal, no Enter),
//                "insert" (into the editor at the cursor), "copy" (clipboard)
//
// Variables (filled in automatically; spaces/case don't matter, {{currentBranch}} also works):
//   {{current branch}} {{default branch}} {{remote url}} {{repo name}} {{repo root}}
//   {{workspace folder}} {{workspace name}} {{file}} {{file name}} {{file dir}}
//   {{relative file}} {{line}} {{selection}} {{clipboard}} {{date}} {{time}} {{uuid}}
//
// Anything else is asked for when the snippet runs:
//   {{repo url}}            free text
//   {{branch=main}}         free text, prefilled with "main"
//   {{type=feat|fix|chore}} pick one
// The same name used twice is asked once. Write \\{{ for a literal {{.
{
  "Git": [
    {
      "name": "Init repo from existing remote",
      "description": "git init + merge a remote with unrelated history",
      "body": [
        "git init",
        "git remote add origin {{repo url}}",
        "git fetch origin",
        "git merge origin/{{remote branch=main}} --allow-unrelated-histories"
      ]
    },
    {
      "name": "Rebase on default branch",
      "body": ["git fetch origin", "git rebase origin/{{default branch}}"]
    },
    {
      "name": "Push current branch",
      "body": "git push -u origin {{current branch}}"
    },
    {
      "name": "New branch",
      "body": "git switch -c {{type=feat|fix|chore}}/{{branch name}}",
      "action": "paste"
    }
  ],
  "Test (safe)": [
    {
      "name": "Show git variables",
      "description": "only echoes, changes nothing",
      "body": [
        "echo 'current branch: {{current branch}}'",
        "echo 'default branch: {{default branch}}'",
        "echo 'remote url:     {{remote url}}'",
        "echo 'repo name:      {{repo name}}'"
      ]
    },
    {
      "name": "Git status",
      "body": "git status --short --branch"
    },
    {
      "name": "Last commits on current branch",
      "body": "git log --oneline -n {{how many=5}} {{current branch}}"
    },
    {
      "name": "Commits ahead of default branch",
      "body": "git log --oneline origin/{{default branch}}..HEAD"
    },
    {
      "name": "Prompt demo",
      "description": "text, prefilled and pick prompts; {{name}} is asked once",
      "body": [
        "echo 'Hello {{name}}!'",
        "echo 'Color: {{color=red|green|blue}}, size: {{size=M}}'",
        "echo 'Bye {{name}}.'"
      ]
    },
    {
      "name": "Paste demo (does not run)",
      "body": ["echo 'line one'", "echo 'line two'"],
      "action": "paste"
    },
    {
      "name": "Current file info",
      "body": "echo '{{relative file}} line {{line}} in {{workspace name}}'",
      "action": "copy"
    }
  ],
  "Text": [
    {
      "name": "Today's date",
      "body": "{{date}}",
      "action": "insert"
    }
  ]
}
`;

// ---------- storage ----------

/** Reads and validates the snippets file. Returns undefined (after telling the user) on errors. */
async function load(): Promise<Snippet[] | undefined> {
  let text: string;
  try {
    text = await fs.promises.readFile(STORAGE_FILE, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      void showFileError(`cannot read the snippets file: ${(err as Error).message}`);
      return undefined;
    }
    text = SEED;
    await writeAtomic(SEED);
  }

  const errors: jsonc.ParseError[] = [];
  const data: unknown = jsonc.parse(text, errors, { allowTrailingComma: true });
  if (errors.length) {
    const e = errors[0];
    const line = text.slice(0, e.offset).split('\n').length;
    void showFileError(`syntax error on line ${line} (${jsonc.printParseErrorCode(e.error)}).`);
    return undefined;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    void showFileError('the file must contain an object whose keys are categories.');
    return undefined;
  }

  const result: Snippet[] = [];
  const problems: string[] = [];
  for (const [category, list] of Object.entries(data)) {
    if (category === '$schema') {
      continue;
    }
    if (!Array.isArray(list)) {
      problems.push(`"${category}" is not a list`);
      continue;
    }
    list.forEach((raw: Record<string, unknown>, i) => {
      const body = Array.isArray(raw?.body) ? raw.body.join('\n') : raw?.body;
      if (typeof raw?.name !== 'string' || typeof body !== 'string') {
        problems.push(`"${category}" item ${i + 1} needs "name" and "body"`);
        return;
      }
      const action = ACTIONS.includes(raw.action as Action) ? (raw.action as Action) : 'run';
      result.push({
        name: raw.name,
        category,
        description: typeof raw.description === 'string' ? raw.description : undefined,
        body,
        action,
        index: i,
      });
    });
  }
  if (problems.length) {
    void showFileError(`skipped invalid entries: ${problems.join('; ')}.`);
  }
  return result;
}

async function writeAtomic(text: string): Promise<void> {
  // Write to a temp file and rename, so another window never reads a half-written file.
  const tmp = `${STORAGE_FILE}.${process.pid}.tmp`;
  await fs.promises.writeFile(tmp, text);
  await fs.promises.rename(tmp, STORAGE_FILE);
}

async function showFileError(message: string): Promise<void> {
  const open = 'Open File';
  if ((await vscode.window.showErrorMessage(`Snippet Shelf: ${message}`, open)) === open) {
    await openFile();
  }
}

async function openFile(): Promise<void> {
  if (!fs.existsSync(STORAGE_FILE)) {
    await writeAtomic(SEED);
  }
  await vscode.window.showTextDocument(vscode.Uri.file(STORAGE_FILE));
}

// ---------- git (read through workspace.fs, so it also works for remote folders) ----------

interface GitRepo {
  root: vscode.Uri;
  /** .git dir of this worktree (HEAD lives here). */
  gitDir: vscode.Uri;
  /** Shared .git dir (refs, config); differs from gitDir only for linked worktrees. */
  commonDir: vscode.Uri;
}

async function readText(uri: vscode.Uri): Promise<string | undefined> {
  try {
    return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
  } catch {
    return undefined;
  }
}

function resolveGitPath(base: vscode.Uri, p: string): vscode.Uri {
  const posix = p.replace(/\\/g, '/');
  if (posix.startsWith('/')) {
    return base.with({ path: posix });
  }
  if (/^[A-Za-z]:\//.test(posix)) {
    return base.with({ path: '/' + posix });
  }
  return vscode.Uri.joinPath(base, posix);
}

async function findRepo(start: vscode.Uri): Promise<GitRepo | undefined> {
  let dir = start;
  for (let i = 0; i < 64; i++) {
    const dotGit = vscode.Uri.joinPath(dir, '.git');
    let stat: vscode.FileStat | undefined;
    try {
      stat = await vscode.workspace.fs.stat(dotGit);
    } catch {
      // not here, try the parent
    }
    if (stat) {
      let gitDir = dotGit;
      if (stat.type & vscode.FileType.File) {
        // worktree or submodule: ".git" is a file containing "gitdir: <path>"
        const m = /^gitdir:\s*(.+)$/m.exec((await readText(dotGit)) ?? '');
        if (!m) {
          return undefined;
        }
        gitDir = resolveGitPath(dir, m[1].trim());
      }
      const common = (await readText(vscode.Uri.joinPath(gitDir, 'commondir')))?.trim();
      return { root: dir, gitDir, commonDir: common ? resolveGitPath(gitDir, common) : gitDir };
    }
    const parent = vscode.Uri.joinPath(dir, '..');
    if (parent.path === dir.path) {
      return undefined;
    }
    dir = parent;
  }
  return undefined;
}

async function currentBranch(repo: GitRepo): Promise<string | undefined> {
  const head = (await readText(vscode.Uri.joinPath(repo.gitDir, 'HEAD')))?.trim();
  if (!head) {
    return undefined;
  }
  const m = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
  return m ? m[1] : head.slice(0, 7); // detached HEAD: short commit id
}

async function hasRef(repo: GitRepo, ref: string): Promise<boolean> {
  if (await readText(vscode.Uri.joinPath(repo.commonDir, ref))) {
    return true;
  }
  const packed = (await readText(vscode.Uri.joinPath(repo.commonDir, 'packed-refs'))) ?? '';
  return packed.split('\n').some((l) => l.trim().endsWith(` ${ref}`));
}

async function defaultBranch(repo: GitRepo): Promise<string | undefined> {
  const remote = (await primaryRemote(repo))?.name ?? 'origin';
  const head = await readText(vscode.Uri.joinPath(repo.commonDir, `refs/remotes/${remote}/HEAD`));
  const m = head && /^ref:\s*refs\/remotes\/[^/]+\/(.+)$/.exec(head.trim());
  if (m) {
    return m[1];
  }
  for (const name of ['main', 'master', 'trunk', 'develop']) {
    if (await hasRef(repo, `refs/remotes/${remote}/${name}`)) {
      return name;
    }
  }
  for (const name of ['main', 'master', 'trunk', 'develop']) {
    if (await hasRef(repo, `refs/heads/${name}`)) {
      return name;
    }
  }
  return undefined;
}

/** "origin" if it exists, otherwise the first remote in .git/config. */
async function primaryRemote(repo: GitRepo): Promise<{ name: string; url: string } | undefined> {
  const config = (await readText(vscode.Uri.joinPath(repo.commonDir, 'config'))) ?? '';
  const remotes: { name: string; url: string }[] = [];
  let section: string | undefined;
  for (const line of config.split(/\r?\n/)) {
    const header = /^\s*\[remote\s+"([^"]+)"\]/.exec(line);
    if (header) {
      section = header[1];
      continue;
    }
    if (/^\s*\[/.test(line)) {
      section = undefined;
      continue;
    }
    const url = section && /^\s*url\s*=\s*(.+?)\s*$/.exec(line);
    if (section && url && !remotes.some((r) => r.name === section)) {
      remotes.push({ name: section, url: url[1] });
    }
  }
  return remotes.find((r) => r.name === 'origin') ?? remotes[0];
}

// ---------- variables ----------

/** Lowercase and drop everything but letters/digits: "Current Branch" = "currentBranch". */
const norm = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');

class Context {
  readonly editor = vscode.window.activeTextEditor;
  private repo?: Promise<GitRepo | undefined>;

  get folder(): vscode.WorkspaceFolder | undefined {
    const doc = this.editor?.document.uri;
    return (doc && vscode.workspace.getWorkspaceFolder(doc)) ?? vscode.workspace.workspaceFolders?.[0];
  }

  git(): Promise<GitRepo | undefined> {
    if (!this.repo) {
      const doc = this.editor?.document.uri;
      const start =
        doc && vscode.workspace.getWorkspaceFolder(doc)
          ? vscode.Uri.joinPath(doc, '..')
          : this.folder?.uri;
      this.repo = start ? findRepo(start) : Promise.resolve(undefined);
    }
    return this.repo;
  }

  get file(): vscode.Uri | undefined {
    const uri = this.editor?.document.uri;
    return uri && !this.editor?.document.isUntitled ? uri : undefined;
  }
}

type Resolver = (ctx: Context) => Thenable<string | undefined> | string | undefined;

const pad = (n: number) => String(n).padStart(2, '0');
const fsPath = (uri: vscode.Uri | undefined) => uri?.fsPath;

/** Display name → resolver. Lookup is by norm(name), plus the aliases below. */
const BUILTINS: Record<string, Resolver> = {
  'current branch': async (c) => {
    const repo = await c.git();
    return repo && currentBranch(repo);
  },
  'default branch': async (c) => {
    const repo = await c.git();
    return repo && defaultBranch(repo);
  },
  'remote url': async (c) => {
    const repo = await c.git();
    return repo && (await primaryRemote(repo))?.url;
  },
  'repo name': async (c) => {
    const repo = await c.git();
    if (!repo) {
      return undefined;
    }
    const url = (await primaryRemote(repo))?.url;
    const fromUrl = url?.replace(/\/+$/, '').split(/[/:]/).pop()?.replace(/\.git$/, '');
    return fromUrl || repo.root.path.split('/').filter(Boolean).pop();
  },
  'repo root': async (c) => fsPath((await c.git())?.root),
  'workspace folder': (c) => fsPath(c.folder?.uri),
  'workspace name': (c) => c.folder?.name,
  file: (c) => fsPath(c.file),
  'file name': (c) => c.file && path.posix.basename(c.file.path),
  'file dir': (c) => c.file && fsPath(vscode.Uri.joinPath(c.file, '..')),
  'relative file': (c) => c.file && vscode.workspace.asRelativePath(c.file, false),
  line: (c) => (c.editor ? String(c.editor.selection.active.line + 1) : undefined),
  selection: (c) =>
    c.editor && !c.editor.selection.isEmpty
      ? c.editor.document.getText(c.editor.selection)
      : undefined,
  clipboard: () => vscode.env.clipboard.readText(),
  date: () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  },
  time: () => {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  uuid: () => crypto.randomUUID(),
};

const ALIASES: Record<string, string> = {
  branch: 'current branch',
  mainbranch: 'default branch',
  origin: 'remote url',
  originurl: 'remote url',
  repo: 'repo name',
  workspace: 'workspace folder',
  linenumber: 'line',
  filepath: 'file',
  selectedtext: 'selection',
};

function builtin(name: string): Resolver | undefined {
  const key = norm(name);
  const display = ALIASES[key] ?? Object.keys(BUILTINS).find((k) => norm(k) === key);
  return display ? BUILTINS[display] : undefined;
}

// `{{name}}` or `{{name=default}}` / `{{name=a|b|c}}`; `\{{` is a literal `{{`.
const VAR_RE = /(?<!\\)\{\{\s*([^{}=]+?)\s*(?:=([^{}]*))?\}\}/g;

/** Fills in every variable. Returns undefined if the user cancels a prompt. */
async function expand(snippet: Snippet): Promise<string | undefined> {
  const ctx = new Context();
  const vars = new Map<string, { name: string; defaultValue?: string }>();
  for (const m of snippet.body.matchAll(VAR_RE)) {
    const key = norm(m[1]);
    const prev = vars.get(key);
    if (!prev || (prev.defaultValue === undefined && m[2] !== undefined)) {
      vars.set(key, { name: m[1], defaultValue: m[2] });
    }
  }

  const values = new Map<string, string>();
  const prompts: [string, { name: string; defaultValue?: string }][] = [];
  for (const [key, v] of vars) {
    const resolve = builtin(v.name);
    const value = resolve ? await resolve(ctx) : undefined;
    if (value !== undefined) {
      values.set(key, value);
    } else {
      prompts.push([key, v]); // user variable, or a built-in that has no value here
    }
  }

  for (const [i, [key, v]] of prompts.entries()) {
    const step = prompts.length > 1 ? ` (${i + 1}/${prompts.length})` : '';
    const title = `${snippet.name}${step}`;
    const choices = v.defaultValue?.includes('|') ? v.defaultValue.split('|') : undefined;
    const value = choices
      ? await vscode.window.showQuickPick(choices, {
          title,
          placeHolder: v.name,
          ignoreFocusOut: true,
        })
      : await vscode.window.showInputBox({
          title,
          prompt: builtin(v.name) ? `${v.name} (could not be detected here)` : v.name,
          value: v.defaultValue,
          ignoreFocusOut: true,
        });
    if (value === undefined) {
      return undefined;
    }
    values.set(key, value);
  }

  return snippet.body
    .replace(VAR_RE, (_, name: string) => values.get(norm(name)) ?? '')
    .replace(/\\\{\{/g, '{{')
    .replace(/\s+$/, '');
}

// ---------- actions ----------

async function getTerminal(): Promise<vscode.Terminal | undefined> {
  if (vscode.window.activeTerminal) {
    return vscode.window.activeTerminal;
  }
  // Use the built-in command rather than createTerminal(): from a UI extension, createTerminal()
  // would open a *local* shell even in a dev container / WSL / SSH window.
  const opened = new Promise<vscode.Terminal | undefined>((resolve) => {
    const sub = vscode.window.onDidOpenTerminal((t) => {
      sub.dispose();
      resolve(t);
    });
    setTimeout(() => {
      sub.dispose();
      resolve(undefined);
    }, 5000);
  });
  await vscode.commands.executeCommand('workbench.action.terminal.new');
  return vscode.window.activeTerminal ?? (await opened);
}

async function perform(snippet: Snippet, action: Action = snippet.action): Promise<void> {
  const text = await expand(snippet);
  if (text === undefined) {
    return;
  }
  switch (action) {
    case 'copy':
      await vscode.env.clipboard.writeText(text);
      vscode.window.setStatusBarMessage(`$(copy) Copied "${snippet.name}"`, 3000);
      return;

    case 'insert': {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        await vscode.env.clipboard.writeText(text);
        void vscode.window.showInformationMessage('No active editor; the snippet was copied.');
        return;
      }
      await editor.edit((eb) => editor.selections.forEach((s) => eb.replace(s, text)));
      return;
    }

    case 'run':
    case 'paste': {
      const terminal = await getTerminal();
      if (!terminal) {
        void vscode.window.showErrorMessage('Snippet Shelf: could not open a terminal.');
        return;
      }
      terminal.show();
      if (action === 'run' || !text.includes('\n')) {
        terminal.sendText(text, action === 'run');
        return;
      }
      // Multi-line without running: go through the terminal's paste, which uses bracketed paste
      // so the shell does not execute each line. Restore the clipboard afterwards.
      const saved = await vscode.env.clipboard.readText();
      await vscode.env.clipboard.writeText(text);
      await vscode.commands.executeCommand('workbench.action.terminal.paste');
      setTimeout(() => void vscode.env.clipboard.writeText(saved), 500);
      return;
    }
  }
}

// ---------- quick pick ----------

const ACTION_INFO: Record<Action, { icon: string; label: string }> = {
  run: { icon: 'play', label: 'Run in terminal' },
  paste: { icon: 'terminal', label: 'Paste into terminal (don’t run)' },
  insert: { icon: 'insert', label: 'Insert into editor' },
  copy: { icon: 'copy', label: 'Copy' },
};
const ACTION_BUTTONS = Object.fromEntries(
  ACTIONS.map((a) => [
    a,
    { iconPath: new vscode.ThemeIcon(ACTION_INFO[a].icon), tooltip: ACTION_INFO[a].label },
  ]),
) as Record<Action, vscode.QuickInputButton>;
const BTN_EDIT_FILE: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('edit'),
  tooltip: 'Edit snippets file',
};

type Item = vscode.QuickPickItem & { snippet?: Snippet; openFile?: boolean };

function preview(body: string): string {
  const lines = body.split('\n').filter((l) => l.trim());
  const text = lines.join('  ⏎  ');
  return text.length > 160 ? text.slice(0, 157) + '…' : text;
}

function buildItems(snippets: Snippet[]): Item[] {
  const items: Item[] = [];
  let category: string | undefined;
  for (const s of snippets) {
    if (s.category !== category) {
      category = s.category;
      items.push({ label: category, kind: vscode.QuickPickItemKind.Separator });
    }
    items.push({
      label: s.name,
      iconPath: new vscode.ThemeIcon(ACTION_INFO[s.action].icon),
      description: [s.description, s.category].filter(Boolean).join(' · '),
      detail: preview(s.body),
      snippet: s,
      buttons: ACTIONS.filter((a) => a !== s.action).map((a) => ACTION_BUTTONS[a]),
    });
  }
  if (!items.length) {
    items.push({ label: '$(edit) No snippets yet. Edit the snippets file…', openFile: true });
  }
  return items;
}

async function showSnippets(args?: { category?: string }): Promise<void> {
  let snippets = await load();
  if (!snippets) {
    return;
  }
  if (args?.category) {
    snippets = snippets.filter((s) => s.category.toLowerCase() === args.category!.toLowerCase());
  }

  const qp = vscode.window.createQuickPick<Item>();
  qp.title = args?.category ? `Snippets: ${args.category}` : 'Snippets';
  qp.placeholder = 'Enter: default action (icon) · item buttons: other actions';
  qp.matchOnDescription = true;
  qp.matchOnDetail = true;
  qp.buttons = [BTN_EDIT_FILE];
  qp.items = buildItems(snippets);

  const done = (fn: () => Promise<void>) => {
    qp.hide();
    void fn();
  };
  qp.onDidAccept(() => {
    const item = qp.selectedItems[0];
    if (item?.openFile) {
      done(openFile);
    } else if (item?.snippet) {
      done(() => perform(item.snippet!));
    }
  });
  qp.onDidTriggerItemButton(({ item, button }) => {
    const action = ACTIONS.find((a) => ACTION_BUTTONS[a] === button);
    if (item.snippet && action) {
      done(() => perform(item.snippet!, action));
    }
  });
  qp.onDidTriggerButton((b) => b === BTN_EDIT_FILE && done(openFile));
  qp.onDidHide(() => qp.dispose());
  qp.show();
}

// ---------- other commands ----------

/** For keybindings: { "command": "snippetShelf.run", "args": { "name": "...", "category"?: "..." } } */
async function runByName(args?: { name?: string; category?: string; action?: Action }): Promise<void> {
  if (!args?.name) {
    return showSnippets(args);
  }
  const snippets = await load();
  const snippet = snippets?.find(
    (s) => s.name === args.name && (!args.category || s.category === args.category),
  );
  if (!snippet) {
    if (snippets) {
      void vscode.window.showErrorMessage(`Snippet Shelf: no snippet named "${args.name}".`);
    }
    return;
  }
  await perform(snippet, ACTIONS.includes(args.action!) ? args.action : undefined);
}

async function addFromSelection(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  const body = editor?.selections
    .map((s) => editor.document.getText(s))
    .filter(Boolean)
    .join('\n');
  if (!body) {
    void vscode.window.showWarningMessage('Select some text first.');
    return;
  }
  const snippets = await load();
  if (!snippets) {
    return;
  }

  const name = await vscode.window.showInputBox({
    title: 'Save as snippet (1/3)',
    prompt: 'Snippet name',
    validateInput: (v) => (v.trim() ? undefined : 'Name cannot be empty'),
  });
  if (!name) {
    return;
  }

  const NEW = '$(add) New category…';
  const categories = [...new Set(snippets.map((s) => s.category))];
  let category = await vscode.window.showQuickPick([...categories, NEW], {
    title: 'Save as snippet (2/3)',
    placeHolder: 'Category',
  });
  if (category === NEW) {
    category = (
      await vscode.window.showInputBox({
        title: 'Save as snippet (2/3)',
        prompt: 'New category name',
        validateInput: (v) => (v.trim() ? undefined : 'Name cannot be empty'),
      })
    )?.trim();
  }
  if (!category) {
    return;
  }

  const picked = await vscode.window.showQuickPick(
    ACTIONS.map((a) => ({ label: `$(${ACTION_INFO[a].icon}) ${ACTION_INFO[a].label}`, action: a })),
    { title: 'Save as snippet (3/3)', placeHolder: 'What should Enter do?' },
  );
  if (!picked) {
    return;
  }

  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const entry: Record<string, unknown> = {
    name: name.trim(),
    body: lines.length === 1 ? lines[0] : lines,
  };
  if (picked.action !== 'run') {
    entry.action = picked.action;
  }

  // jsonc-parser edits the text in place, so comments and formatting in the file are kept.
  const text = await fs.promises.readFile(STORAGE_FILE, 'utf8');
  const exists = categories.includes(category);
  const edits = jsonc.modify(text, exists ? [category, -1] : [category], exists ? entry : [entry], {
    isArrayInsertion: exists,
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: '\n' },
  });
  await writeAtomic(jsonc.applyEdits(text, edits));

  const open = 'Open File';
  if (
    (await vscode.window.showInformationMessage(`Saved "${entry.name}" in ${category}.`, open)) ===
    open
  ) {
    await openFile();
  }
}

async function showVariables(): Promise<void> {
  const ctx = new Context();
  const items = await Promise.all(
    Object.entries(BUILTINS).map(async ([name, resolve]) => {
      const value = await resolve(ctx);
      return {
        label: `{{${name}}}`,
        description: value === undefined ? '(not available here; will be asked)' : value,
        value,
      };
    }),
  );
  const picked = await vscode.window.showQuickPick(items, {
    title: 'Snippet Shelf variables (Enter copies the value)',
    matchOnDescription: true,
  });
  if (picked?.value !== undefined) {
    await vscode.env.clipboard.writeText(picked.value);
  }
}

// ---------- sidebar tree ----------

type Node = { category: string; snippets: Snippet[] } | Snippet;
const isSnippet = (n: Node): n is Snippet => 'body' in n;

class SnippetTree implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.changed.event;
  private snippets: Snippet[] = [];

  refresh(): void {
    this.changed.fire();
  }

  async getChildren(node?: Node): Promise<Node[]> {
    if (node) {
      return isSnippet(node) ? [] : node.snippets;
    }
    this.snippets = (await load()) ?? [];
    const groups = new Map<string, Snippet[]>();
    for (const s of this.snippets) {
      groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
    }
    return [...groups].map(([category, snippets]) => ({ category, snippets }));
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (!isSnippet(node)) {
      const item = new vscode.TreeItem(node.category, vscode.TreeItemCollapsibleState.Expanded);
      item.id = `cat:${node.category}`;
      item.iconPath = new vscode.ThemeIcon('folder');
      item.description = String(node.snippets.length);
      item.contextValue = 'category';
      return item;
    }
    const item = new vscode.TreeItem(node.name, vscode.TreeItemCollapsibleState.None);
    item.id = `snip:${node.category}:${node.index}`;
    item.iconPath = new vscode.ThemeIcon(ACTION_INFO[node.action].icon);
    item.description = node.description ?? preview(node.body);
    const tooltip = new vscode.MarkdownString();
    tooltip.appendMarkdown(`**${node.name}** · Enter: ${ACTION_INFO[node.action].label}\n\n`);
    tooltip.appendCodeblock(node.body, 'shellscript');
    item.tooltip = tooltip;
    item.contextValue = 'snippet';
    // Clicking only selects; running is done with the inline buttons (or Enter via the command
    // below), so a stray click never runs a command in the terminal.
    return item;
  }
}

/** Opens the snippets file with the cursor on the given snippet. */
async function revealInFile(snippet: Snippet): Promise<void> {
  await openFile();
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const root = jsonc.parseTree(editor.document.getText());
  const node = root && jsonc.findNodeAtLocation(root, [snippet.category, snippet.index]);
  if (node) {
    const range = new vscode.Range(
      editor.document.positionAt(node.offset),
      editor.document.positionAt(node.offset + node.length),
    );
    editor.selection = new vscode.Selection(range.start, range.start);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  }
}

// ---------- activation ----------

export function activate(context: vscode.ExtensionContext): void {
  const status = vscode.window.createStatusBarItem(
    'snippetShelf.status',
    vscode.StatusBarAlignment.Left,
    -1,
  );
  status.name = 'Snippet Shelf';
  status.text = '$(symbol-snippet)';
  status.tooltip = 'Snippet Shelf';
  status.command = 'snippetShelf.show';
  status.show();

  context.subscriptions.push(
    status,
    vscode.commands.registerCommand('snippetShelf.show', showSnippets),
    vscode.commands.registerCommand('snippetShelf.run', runByName),
    vscode.commands.registerCommand('snippetShelf.openFile', openFile),
    vscode.commands.registerCommand('snippetShelf.addFromSelection', addFromSelection),
    vscode.commands.registerCommand('snippetShelf.showVariables', showVariables),
  );

  const tree = new SnippetTree();
  const view = vscode.window.createTreeView('snippetShelf.tree', {
    treeDataProvider: tree,
    showCollapseAll: true,
  });
  // Re-read the file when it changes (saved here, in another window, or by "Save as snippet").
  const onFileChange = () => tree.refresh();
  fs.watchFile(STORAGE_FILE, { interval: 1000 }, onFileChange);

  const treeAction = (action?: Action) => (node?: Node) => {
    const target = node ?? view.selection[0];
    if (target && isSnippet(target)) {
      void perform(target, action);
    }
  };
  context.subscriptions.push(
    view,
    { dispose: () => fs.unwatchFile(STORAGE_FILE, onFileChange) },
    vscode.commands.registerCommand('snippetShelf.tree.refresh', () => tree.refresh()),
    vscode.commands.registerCommand('snippetShelf.tree.default', treeAction()),
    ...ACTIONS.map((a) => vscode.commands.registerCommand(`snippetShelf.tree.${a}`, treeAction(a))),
    vscode.commands.registerCommand('snippetShelf.tree.reveal', (node?: Node) => {
      const target = node ?? view.selection[0];
      if (target && isSnippet(target)) {
        void revealInFile(target);
      }
    }),
  );
}

export function deactivate(): void {
  // Anything pushed to context.subscriptions is disposed automatically.
}
