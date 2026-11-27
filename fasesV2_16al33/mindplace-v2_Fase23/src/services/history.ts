import type { MindPlaceStore } from '../domain/models';

export interface HistorySnapshot { id: string; label: string; createdAt: number; store: MindPlaceStore; }

export class UndoRedoManager {
  private readonly undoStack: HistorySnapshot[] = [];
  private readonly redoStack: HistorySnapshot[] = [];
  constructor(private readonly maxEntries = 100) {}

  push(snapshot: HistorySnapshot): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxEntries) this.undoStack.shift();
    this.redoStack.length = 0;
  }
  undo(current: HistorySnapshot): HistorySnapshot | null {
    const previous = this.undoStack.pop() ?? null;
    if (!previous) return null;
    this.redoStack.push(current); return previous;
  }
  redo(current: HistorySnapshot): HistorySnapshot | null {
    const next = this.redoStack.pop() ?? null;
    if (!next) return null;
    this.undoStack.push(current); return next;
  }
  clear(): void { this.undoStack.length = 0; this.redoStack.length = 0; }
  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
}
