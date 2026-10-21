import { CommandHistory } from '../commands/CommandHistory.js';
import { EditCommand } from '../commands/EditCommand.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { DocumentStore } from '../ports/DocumentStore.js';

export class Editor {
  private current?: SvgDocument;
  private path?: string;
  private readonly history = new CommandHistory();
  constructor(private readonly store: DocumentStore) {}

  /** A snapshot keeps callers from mutating the current document outside commands. */
  snapshot(): SvgDocument { return this.document().clone(); }
  init(width = 800, height = 600): string {
    const next = new SvgDocument(width, height);
    this.current = next; this.path = undefined; this.history.barrier();
    return `canvas ${width}x${height} created`;
  }
  read(path: string): string {
    const result = this.store.read(path);
    this.current = result.document; this.path = path; this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.shapes.length} elements)`].join('\n');
  }
  save(path?: string): string {
    const document = this.document();
    const target = path ?? this.path;
    if (!target) throw new Error('no file path. use save <file.svg>');
    this.store.write(target, document);
    this.path = target; this.history.barrier();
    return `saved to ${target} (${document.shapes.length} elements)`;
  }
  canvas(width?: number, height?: number): string {
    const document = this.document();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new Error('canvas requires width and height');
    const next = document.clone(); next.resize(width, height);
    this.current = next; this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }
  execute(command: EditCommand): string {
    this.current = this.history.execute(this.document(), command);
    return this.history.feedback;
  }
  undo(): string { this.document(); this.current = this.history.undo(); return this.history.feedback; }
  redo(): string { this.document(); this.current = this.history.redo(); return this.history.feedback; }
  private document(): SvgDocument {
    if (!this.current) throw new Error("no document. use 'init' or 'read' first");
    return this.current;
  }
}
