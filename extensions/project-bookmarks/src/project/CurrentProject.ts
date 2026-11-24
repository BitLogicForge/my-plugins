import * as vscode from 'vscode';

/** The folder or workspace file open in this window. */
export class CurrentProject {
  readonly uri: vscode.Uri;
  readonly isWorkspaceFile: boolean;

  private constructor(uri: vscode.Uri, isWorkspaceFile: boolean) {
    this.uri = uri;
    this.isWorkspaceFile = isWorkspaceFile;
  }

  static get(): CurrentProject | undefined {
    const wsFile = vscode.workspace.workspaceFile;
    if (wsFile && wsFile.scheme !== 'untitled') {
      return new CurrentProject(wsFile, true);
    }
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder && new CurrentProject(folder.uri, false);
  }

  static get key(): string | undefined {
    return CurrentProject.get()?.key;
  }

  /** The value stored as `Bookmark.uri`. */
  get key(): string {
    return this.uri.toString();
  }

  get defaultLabel(): string {
    const base = this.uri.path.split('/').filter(Boolean).pop() ?? this.key;
    return this.isWorkspaceFile ? base.replace(/\.code-workspace$/, '') : base;
  }
}
