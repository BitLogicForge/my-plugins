import type * as vscode from 'vscode';

/** Base class for objects that own disposables. */
export abstract class DisposableStore implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];

  protected register<T extends vscode.Disposable>(disposable: T): T {
    this.disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    this.disposables.splice(0).forEach((d) => d.dispose());
  }
}
