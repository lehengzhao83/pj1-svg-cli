import { Editor } from '../application/Editor.js';
import { AddToCommand } from '../commands/AddToCommand.js';
import { CreateCommand } from '../commands/CreateCommand.js';
import { DeleteCommand } from '../commands/DeleteCommand.js';
import { GroupCommand } from '../commands/GroupCommand.js';
import { MoveCommand } from '../commands/MoveCommand.js';
import { ReorderCommand } from '../commands/ReorderCommand.js';
import { ScaleCommand } from '../commands/ScaleCommand.js';
import { SetCommand } from '../commands/SetCommand.js';
import { UngroupCommand } from '../commands/UngroupCommand.js';
import { Numbers } from '../domain/Numbers.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { Token } from './Token.js';
import { Tokenizer } from './Tokenizer.js';
import { TreeRenderer } from './TreeRenderer.js';

export class CommandRouter {
  private readonly tokenizer = new Tokenizer();
  private readonly renderer = new TreeRenderer();
  private readonly handlers: ReadonlyMap<string, (tokens: readonly Token[]) => string>;
  private exit = false;

  constructor(private readonly editor: Editor, private readonly factory = new ShapeFactory()) {
    // Phase 1 command-name dispatch boundary; future commands can be registered as providers.
    this.handlers = new Map<string, (tokens: readonly Token[]) => string>([
      ['help', tokens => { this.arity(tokens, 0); return this.help(); }],
      ['quit', tokens => { this.arity(tokens, 0); this.exit = true; return 'bye'; }],
      ['exit', tokens => { this.arity(tokens, 0); this.exit = true; return 'bye'; }],
      ['init', tokens => {
        this.arity(tokens, 0, 2);
        return this.editor.init(this.number(tokens, 0, 800), this.number(tokens, 1, 600));
      }],
      ['read', tokens => { this.arity(tokens, 1); return this.editor.read(tokens[0]!.value); }],
      ['save', tokens => { this.arity(tokens, 0, 1); return this.editor.save(tokens[0]?.value); }],
      ['canvas', tokens => {
        if (tokens.length !== 0 && tokens.length !== 2) throw new Error('usage: canvas [w h]');
        return tokens.length === 0 ? this.editor.canvas() : this.editor.canvas(this.number(tokens, 0), this.number(tokens, 1));
      }],
      ['create', tokens => this.create(tokens)],
      ['delete', tokens => { this.arity(tokens, 1); return this.editor.execute(new DeleteCommand(tokens[0]!.value)); }],
      ['move', tokens => { this.arity(tokens, 3); return this.editor.execute(new MoveCommand(tokens[0]!.value, this.number(tokens, 1), this.number(tokens, 2))); }],
      ['scale', tokens => { this.arity(tokens, 2); return this.editor.execute(new ScaleCommand(tokens[0]!.value, this.number(tokens, 1))); }],
      ['set', tokens => { this.arity(tokens, 3); return this.editor.execute(new SetCommand(tokens[0]!.value, tokens[1]!.value, tokens[2]!.value)); }],
      ['group', tokens => { this.arity(tokens, 2, Infinity); return this.editor.execute(new GroupCommand(tokens[0]!.value, tokens.slice(1).map(token => token.value))); }],
      ['ungroup', tokens => { this.arity(tokens, 1); return this.editor.execute(new UngroupCommand(tokens[0]!.value)); }],
      ['addto', tokens => { this.arity(tokens, 2); return this.editor.execute(new AddToCommand(tokens[0]!.value, tokens[1]!.value)); }],
      ['front', tokens => { this.arity(tokens, 1); return this.editor.execute(new ReorderCommand(tokens[0]!.value, true)); }],
      ['back', tokens => { this.arity(tokens, 1); return this.editor.execute(new ReorderCommand(tokens[0]!.value, false)); }],
      ['tree', tokens => { this.arity(tokens, 0, 1); return this.renderer.tree(this.editor.snapshot(), tokens[0]?.value); }],
      ['show', tokens => { this.arity(tokens, 1); return this.renderer.show(this.editor.snapshot(), tokens[0]!.value); }],
      ['undo', tokens => { this.arity(tokens, 0); return this.editor.undo(); }],
      ['redo', tokens => { this.arity(tokens, 0); return this.editor.redo(); }],
    ]);
  }

  get shouldExit(): boolean { return this.exit; }

  run(line: string): string {
    try {
      const tokens = this.tokenizer.parse(line);
      if (!tokens.length) return '';
      const handler = this.handlers.get(tokens[0]!.value);
      if (!handler) throw new Error(`unknown command: ${tokens[0]!.value}`);
      return handler(tokens.slice(1));
    } catch (error) {
      return `error: ${(error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/gu, ' ')}`;
    }
  }

  private create(tokens: readonly Token[]): string {
    this.arity(tokens, 2, Infinity);
    // Require a document even before factory validation; no-document errors are consistent.
    this.editor.snapshot();
    let parameters = tokens.slice(2);
    let container: string | undefined;
    const marker = parameters.at(-2);
    if (marker?.value === 'in' && !marker.quoted) {
      container = parameters.at(-1)!.value;
      parameters = parameters.slice(0, -2);
    }
    const shape = this.factory.create(tokens[0]!.value, tokens[1]!.value, parameters.map(token => token.value));
    return this.editor.execute(new CreateCommand(shape, container));
  }

  private number(tokens: readonly Token[], index: number, fallback?: number): number {
    const value = tokens[index]?.value;
    if (value === undefined && fallback !== undefined) return fallback;
    if (value === undefined) throw new Error('missing numeric argument');
    return Numbers.parse(value);
  }
  private arity(tokens: readonly Token[], minimum: number, maximum = minimum): void {
    if (tokens.length < minimum || tokens.length > maximum) throw new Error('invalid argument count. type help for syntax');
  }
  private help(): string {
    return [
      'init [w] [h] | read <file.svg> | save [file.svg] | canvas [w h]',
      'create rect <id> <x> <y> <w> <h> [fill] [in <gid>]',
      'create circle <id> <cx> <cy> <r> [fill] [in <gid>]',
      'create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <gid>]',
      'create line <id> <x1> <y1> <x2> <y2> [stroke] [in <gid>]',
      'create text <id> <x> <y> "content" [in <gid>] | create g <id> [in <gid>]',
      'delete <id> | move <id> <dx> <dy> | scale <id> <factor>',
      'set <id> <attr> <value> (fill/stroke/stroke-width, own geometry; text: text)',
      'group <newGid> <id1> [id2 ...] | ungroup <gid> | addto <gid> <id>',
      'front <id> | back <id> | tree [id] | show <id> | undo | redo | help | quit',
      'Use double quotes for spaces; # at the start of a line is a comment.',
    ].join('\n');
  }
}
