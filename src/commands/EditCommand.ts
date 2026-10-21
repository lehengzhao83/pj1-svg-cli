import { SvgDocument } from '../domain/SvgDocument.js';

export abstract class EditCommand {
  private before?: SvgDocument;
  private after?: SvgDocument;
  private message = '';

  get feedback(): string { return this.message; }

  execute(document: SvgDocument): SvgDocument {
    const working = document.clone();
    const message = this.apply(working);
    // Publish snapshots only after the entire mutation succeeds.
    this.before = document.clone();
    this.after = working.clone();
    this.message = message;
    return working;
  }
  undo(): SvgDocument {
    if (!this.before) throw new Error('command has not executed');
    return this.before.clone();
  }
  redo(): SvgDocument {
    if (!this.after) throw new Error('command has not executed');
    return this.after.clone();
  }
  protected abstract apply(document: SvgDocument): string;
}
