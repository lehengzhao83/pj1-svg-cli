import { DocumentStore } from '../src/ports/DocumentStore.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';

export class MemoryDocumentStore implements DocumentStore {
  private readonly files = new Map<string, string>();
  private readonly codec = new SvgCodec();
  seed(path: string, source: string): void { this.files.set(path, source); }
  read(path: string): { document: SvgDocument; warnings: readonly string[] } {
    const source = this.files.get(path);
    if (source === undefined) throw new Error(`cannot read file: ${path}`);
    return this.codec.decode(source);
  }
  write(path: string, document: SvgDocument): void {
    if (path.startsWith('unwritable')) throw new Error(`cannot write file: ${path}`);
    this.files.set(path, this.codec.encode(document));
  }
}
