import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class CommandHistory {
  private readonly past: EditCommand[] = [];
  private readonly future: EditCommand[] = [];
  private blocked = true;
  private message = '';

  get feedback(): string { return this.message; }
  execute(document: SvgDocument, command: EditCommand): SvgDocument {
    const result = command.execute(document);
    this.past.push(command); this.future.length = 0; this.blocked = false;
    this.message = command.feedback;
    return result;
  }
  barrier(): void {
    this.past.length = 0; this.future.length = 0; this.blocked = true;
  }
  undo(): SvgDocument {
    this.check();
    const command = this.past.at(-1);
    if (!command) throw new Error('nothing to undo');
    const result = command.undo();
    this.past.pop(); this.future.push(command);
    this.message = `undone: ${command.feedback}`;
    return result;
  }
  redo(): SvgDocument {
    this.check();
    const command = this.future.at(-1);
    if (!command) throw new Error('nothing to redo');
    const result = command.redo();
    this.future.pop(); this.past.push(command);
    this.message = `redone: ${command.feedback}`;
    return result;
  }
  private check(): void {
    if (this.blocked) throw new Error('undo not allowed after io command');
  }
}
