import * as vscode from 'vscode';
import { Bookmark, isBookmark } from '../bookmarks/Bookmark';
import { DisposableStore } from '../util/DisposableStore';
import type { BookmarkFile } from './BookmarkFile';

/** The bookmarks in memory, kept in sync with the file. Edits throw if the file is unreadable. */
export class BookmarkStore extends DisposableStore {
  private readonly emitter = this.register(new vscode.EventEmitter<void>());
  /** Fires when the bookmarks change (here, in another window, or by hand). */
  readonly onDidChange = this.emitter.event;

  private bookmarks: readonly Bookmark[] = [];
  private problem: string | undefined;

  constructor(private readonly file: BookmarkFile) {
    super();
    this.reload();
    this.register(file.watch(() => this.reload()));
  }

  /** The bookmarks; the last valid ones while the file cannot be read. */
  get list(): readonly Bookmark[] {
    return this.bookmarks;
  }

  /** What is wrong with the file, if anything. */
  get error(): string | undefined {
    return this.problem;
  }

  find(uri: string | undefined): Bookmark | undefined {
    return this.bookmarks.find((b) => b.uri === uri);
  }

  add(...added: Bookmark[]): Promise<void> {
    return this.edit((entries) => [...entries, ...added]);
  }

  rename(uri: string, label: string): Promise<void> {
    return this.edit((entries) =>
      entries.map((e) => (isBookmark(e) && e.uri === uri ? { ...e, label } : e)),
    );
  }

  remove(uri: string): Promise<void> {
    return this.edit((entries) => entries.filter((e) => !(isBookmark(e) && e.uri === uri)));
  }

  /**
   * Edits the raw entries, so invalid entries and unknown fields are kept. Reading first also means
   * a broken file is never overwritten.
   */
  private async edit(change: (entries: unknown[]) => unknown[]): Promise<void> {
    await this.file.write(change(this.file.read()));
    this.reload();
  }

  private reload(): void {
    try {
      const entries = this.file.read();
      this.bookmarks = entries.filter(isBookmark);
      const skipped = entries.length - this.bookmarks.length;
      this.problem = skipped ? `${skipped} invalid bookmark(s) skipped` : undefined;
    } catch (err) {
      this.problem = `Cannot read the bookmarks file: ${(err as Error).message}`;
    }
    this.emitter.fire();
  }
}
