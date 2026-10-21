import assert from 'node:assert/strict';
import { Editor } from '../src/application/Editor.js';
import { CommandRouter } from '../src/cli/CommandRouter.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { MemoryDocumentStore } from './MemoryDocumentStore.js';

export class Session {
  readonly store = new MemoryDocumentStore();
  readonly editor = new Editor(this.store);
  readonly router = new CommandRouter(this.editor);
  constructor(initialize = true) { if (initialize) this.ok('init'); }
  run(line: string): string { return this.router.run(line); }
  ok(line: string): string {
    const output = this.run(line);
    assert.ok(!output.startsWith('error:'), `${line}: ${output}`);
    return output;
  }
  xml(): string { return new SvgCodec().encode(this.editor.snapshot()); }
  unchangedOnError(line: string, expected?: string): void {
    const before = this.xml();
    const result = this.run(line);
    assert.ok(result.startsWith('error:'), `${line}: ${result}`);
    if (expected !== undefined) assert.equal(result, expected);
    assert.equal(this.xml(), before, line);
  }
}
