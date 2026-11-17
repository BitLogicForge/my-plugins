import * as vscode from 'vscode';
import { GitRepo } from '../git/GitRepo';

/**
 * Snapshot of what variables are resolved against: the active editor, its workspace folder and
 * git repository. Create one per snippet expansion so all variables see the same state.
 */
export class EditorContext {
  readonly editor = vscode.window.activeTextEditor;
  private repo?: Promise<GitRepo | undefined>;

  get folder(): vscode.WorkspaceFolder | undefined {
    const doc = this.editor?.document.uri;
    return (
      (doc && vscode.workspace.getWorkspaceFolder(doc)) ?? vscode.workspace.workspaceFolders?.[0]
    );
  }

  /** The active file, unless it is untitled. */
  get file(): vscode.Uri | undefined {
    const uri = this.editor?.document.uri;
    return uri && !this.editor?.document.isUntitled ? uri : undefined;
  }

  /** The repository of the active file, or of the first workspace folder. */
  git(): Promise<GitRepo | undefined> {
    if (!this.repo) {
      const doc = this.editor?.document.uri;
      const start =
        doc && vscode.workspace.getWorkspaceFolder(doc)
          ? vscode.Uri.joinPath(doc, '..')
          : this.folder?.uri;
      this.repo = start ? GitRepo.find(start) : Promise.resolve(undefined);
    }
    return this.repo;
  }
}
