import * as vscode from 'vscode';

/** One saved project. `uri` is the full folder/workspace URI, including the remote authority. */
interface Bookmark {
  uri: string;
  label: string;
  /** true when `uri` points at a .code-workspace file rather than a folder. */
  isWorkspaceFile: boolean;
}

const STORAGE_KEY = 'bookmarks';
const CONTEXT_KEY = 'projectBookmarks.currentIsBookmarked';

// This extension is `extensionKind: ["ui"]`, so it runs in the local VS Code, not inside the
// container. globalState is therefore one store shared by every window: local, WSL, dev containers.
let state: vscode.Memento;
let statusItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext): void {
  state = context.globalState;

  statusItem = vscode.window.createStatusBarItem(
    'projectBookmarks.status',
    vscode.StatusBarAlignment.Left,
    0,
  );
  statusItem.name = 'Project Bookmarks';
  statusItem.command = 'projectBookmarks.show';
  statusItem.show();

  context.subscriptions.push(
    statusItem,
    vscode.commands.registerCommand('projectBookmarks.show', showBookmarks),
    vscode.commands.registerCommand('projectBookmarks.addCurrent', addCurrent),
    vscode.commands.registerCommand('projectBookmarks.removeCurrent', removeCurrent),
    vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus),
    // Another window may have changed the list; re-read it when this window gets focus.
    vscode.window.onDidChangeWindowState((s) => s.focused && refreshStatus()),
  );
  refreshStatus();
}

export function deactivate(): void {
  // Anything pushed to context.subscriptions is disposed automatically.
}

// ---------- storage ----------

function load(): Bookmark[] {
  return state.get<Bookmark[]>(STORAGE_KEY, []);
}

async function save(list: Bookmark[]): Promise<void> {
  await state.update(STORAGE_KEY, list);
  refreshStatus();
}

// ---------- current project ----------

function currentProject(): { uri: vscode.Uri; isWorkspaceFile: boolean } | undefined {
  const wsFile = vscode.workspace.workspaceFile;
  if (wsFile && wsFile.scheme !== 'untitled') {
    return { uri: wsFile, isWorkspaceFile: true };
  }
  const folder = vscode.workspace.workspaceFolders?.[0];
  return folder ? { uri: folder.uri, isWorkspaceFile: false } : undefined;
}

function currentBookmark(list = load()): Bookmark | undefined {
  const cur = currentProject();
  return cur && list.find((b) => b.uri === cur.uri.toString());
}

function refreshStatus(): void {
  const bm = currentBookmark();
  void vscode.commands.executeCommand('setContext', CONTEXT_KEY, !!bm);
  statusItem.text = '$(bookmark)';
  statusItem.tooltip = bm
    ? `Project Bookmarks: this project is bookmarked as "${bm.label}"`
    : 'Project Bookmarks';
}

// ---------- commands ----------

async function addCurrent(): Promise<void> {
  const cur = currentProject();
  if (!cur) {
    void vscode.window.showWarningMessage('Open a folder or workspace first.');
    return;
  }
  const list = load();
  const existing = currentBookmark(list);
  if (existing) {
    await rename(existing);
    return;
  }
  const label = await askLabel(defaultLabel(cur.uri, cur.isWorkspaceFile));
  if (label === undefined) {
    return;
  }
  list.push({ uri: cur.uri.toString(), label, isWorkspaceFile: cur.isWorkspaceFile });
  await save(list);
  void vscode.window.showInformationMessage(`Bookmarked "${label}".`);
}

async function removeCurrent(): Promise<void> {
  const bm = currentBookmark();
  if (bm) {
    await remove(bm);
  }
}

async function rename(bm: Bookmark): Promise<void> {
  const label = await askLabel(bm.label);
  if (label === undefined) {
    return;
  }
  await save(load().map((b) => (b.uri === bm.uri ? { ...b, label } : b)));
}

async function remove(bm: Bookmark): Promise<void> {
  await save(load().filter((b) => b.uri !== bm.uri));
}

function open(bm: Bookmark, newWindow: boolean): void {
  void vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(bm.uri), {
    forceNewWindow: newWindow,
  });
}

function askLabel(value: string): Thenable<string | undefined> {
  return vscode.window
    .showInputBox({
      title: 'Bookmark label',
      value,
      valueSelection: [0, value.length],
      validateInput: (v) => (v.trim() ? undefined : 'Label cannot be empty'),
    })
    .then((v) => v?.trim());
}

// ---------- quick pick ----------

const BTN_NEW_WINDOW: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('empty-window'),
  tooltip: 'Open in new window',
};
const BTN_RENAME: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('edit'),
  tooltip: 'Rename',
};
const BTN_REMOVE: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('close'),
  tooltip: 'Remove bookmark',
};

type Item = vscode.QuickPickItem & { bookmark?: Bookmark; action?: 'add' };

function buildItems(): Item[] {
  const list = load();
  const cur = currentBookmark(list);
  const items: Item[] = [];

  if (!cur && currentProject()) {
    items.push({ label: '$(add) Bookmark current project…', action: 'add', alwaysShow: true });
  }
  if (list.length) {
    items.push({ label: 'Bookmarks', kind: vscode.QuickPickItemKind.Separator });
  }

  for (const b of list) {
    const isCurrent = b === cur;
    const uri = vscode.Uri.parse(b.uri);
    items.push({
      label: b.label,
      iconPath: new vscode.ThemeIcon(isCurrent ? 'check' : locationIcon(uri)),
      description: isCurrent ? `${locationName(uri)} · current` : locationName(uri),
      detail: uri.path,
      bookmark: b,
      buttons: isCurrent ? [BTN_RENAME, BTN_REMOVE] : [BTN_NEW_WINDOW, BTN_RENAME, BTN_REMOVE],
    });
  }

  if (!list.length && !currentProject()) {
    items.push({ label: 'No bookmarks yet. Open a project and bookmark it.', alwaysShow: true });
  }
  return items;
}

function showBookmarks(): void {
  const qp = vscode.window.createQuickPick<Item>();
  qp.title = 'Project Bookmarks';
  qp.placeholder = 'Enter: open here · window button: open in new window';
  qp.matchOnDescription = true;
  qp.matchOnDetail = true;
  qp.items = buildItems();

  qp.onDidAccept(async () => {
    const item = qp.selectedItems[0];
    if (!item) {
      return;
    }
    qp.hide();
    if (item.action === 'add') {
      await addCurrent();
    } else if (item.bookmark && item.bookmark.uri !== currentBookmark()?.uri) {
      open(item.bookmark, false);
    }
  });

  qp.onDidTriggerItemButton(async ({ item, button }) => {
    const bm = item.bookmark;
    if (!bm) {
      return;
    }
    if (button === BTN_NEW_WINDOW) {
      qp.hide();
      open(bm, true);
    } else if (button === BTN_REMOVE) {
      await remove(bm);
      qp.items = buildItems();
    } else if (button === BTN_RENAME) {
      qp.hide(); // the input box replaces the quick pick
      await rename(bm);
      showBookmarks();
    }
  });

  qp.onDidHide(() => qp.dispose());
  qp.show();
}

// ---------- labels ----------

function defaultLabel(uri: vscode.Uri, isWorkspaceFile: boolean): string {
  const base = uri.path.split('/').filter(Boolean).pop() ?? uri.toString();
  return isWorkspaceFile ? base.replace(/\.code-workspace$/, '') : base;
}

/** Remote kind from the authority, e.g. "dev-container+7b22…" → "dev-container". */
function remoteKind(uri: vscode.Uri): string | undefined {
  return uri.scheme === 'vscode-remote' ? uri.authority.split('+')[0] : undefined;
}

function locationName(uri: vscode.Uri): string {
  const kind = remoteKind(uri);
  const arg = decodeURIComponent(uri.authority.split('+')[1] ?? '');
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

function locationIcon(uri: vscode.Uri): string {
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
