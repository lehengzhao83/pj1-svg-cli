import { randomUUID } from 'node:crypto';
import { readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { SvgDocument } from '../domain/SvgDocument.js';
import { DocumentStore } from '../ports/DocumentStore.js';
import { SvgCodec } from './SvgCodec.js';

export class NodeDocumentStore implements DocumentStore {
  constructor(private readonly codec = new SvgCodec()) {}
  read(path: string): { document: SvgDocument; warnings: readonly string[] } {
    let source: string;
    try { source = readFileSync(path, 'utf8'); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }
  write(path: string, document: SvgDocument): void {
    const source = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      writeFileSync(temporary, source, { encoding: 'utf8', flag: 'wx' });
      renameSync(temporary, path);
    } catch {
      try { unlinkSync(temporary); } catch { /* May not have been created. */ }
      throw new Error(`cannot write file: ${path}`);
    }
  }
}
