import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { Editor } from '../src/application/Editor.js';
import { CommandRouter } from '../src/cli/CommandRouter.js';
import { NodeDocumentStore } from '../src/infrastructure/NodeDocumentStore.js';
import { SvgCodec } from '../src/infrastructure/SvgCodec.js';
import { Session } from './Session.js';

test('SVG round trip preserves all types, nesting, order, styles and escaped Unicode text', () => {
  const s = new Session();
  [
    'init 400 300', 'create g scene', 'create rect r 1 2 3 4 #eee in scene',
    'create circle c 5 6 7 in scene', 'create ellipse e 1 2 3 4 in scene',
    'create g nested in scene', 'create line l 0 0 10 20 black in nested',
    'create text t 20 40 "中文 & <text> \\"quote\\" 😀" in nested',
    'set scene stroke-width 1.5', 'set nested fill blue',
  ].forEach(line => s.ok(line));
  const codec = new SvgCodec();
  const encoded = s.xml();
  const decoded = codec.decode(encoded);
  assert.deepEqual(decoded.warnings, []);
  assert.equal(codec.encode(decoded.document), encoded);
  assert.equal(decoded.document.shapes.length, 7);
  assert.equal(decoded.document.require('t').text, '中文 & <text> "quote" 😀');
  assert.match(encoded, /&amp;/); assert.match(encoded, /&lt;text&gt;/);
});

test('import reserves all explicit ids before assigning missing ids and emits exact warnings', () => {
  const result = new SvgCodec().decode('<svg width="100px" height="200px"><rect/><g><circle/><rect id="rect1"/><rect/></g><circle id="circle1"/></svg>');
  assert.deepEqual(result.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id circle2 to unnamed <circle>',
    'warning: assigned id rect3 to unnamed <rect>',
  ]);
  assert.deepEqual(result.document.shapes.map(shape => shape.id), ['rect2', 'g1', 'circle2', 'rect1', 'rect3', 'circle1']);
  assert.equal(result.document.width, 100); assert.equal(result.document.height, 200);
});

test('SVG comments, CDATA, default dimensions and root paint survive supported round trip', () => {
  const codec = new SvgCodec();
  const result = codec.decode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" fill="red"><!-- comment --><text id="t"><![CDATA[<hello>&中文]]></text></svg>');
  assert.equal(result.document.width, 800); assert.equal(result.document.height, 600);
  assert.equal(result.document.require('t').text, '<hello>&中文');
  assert.equal(result.document.root.attributes().fill, 'red');
  assert.equal(codec.decode(codec.encode(result.document)).document.root.attributes().fill, 'red');
});

for (const xml of [
  '', '<g/>', '<svg><g></svg>', '<svg><rect width="oops"/></svg>',
  '<svg/>trailing', 'trailing<svg/>', '<?xml version="1.0"?>trailing<svg/>', '<!-- comment -->trailing<svg/>',
  '<svg><g id="a"/><circle id="a"/></svg>', '<svg><path id="p"/></svg>',
  '<svg><text id="t"><tspan>no</tspan></text></svg>',
  '<svg><rect id="r" transform="rotate(1)"/></svg>',
  '<svg><rect id="r" width="-1"/></svg>', '<svg width="0"/>',
  '<svg width="100" height="100" viewBox="1 0 100 100"/>',
  '<svg xmlns="urn:other"/>', '<svg><g xmlns="urn:other"/></svg>',
  '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///sensitive">]><svg/>',
  '<svg><text>&undefined;</text></svg>', '<svg><g id="bad id"/></svg>',
  '<svg><rect width="1" width="2"/></svg>', '<svg>unexpected</svg>',
  '<svg><circle>unexpected</circle></svg>', '<svg>\u0000</svg>',
]) {
  test(`invalid/unsupported import is atomic: ${JSON.stringify(xml)}`, () => {
    const s = new Session(); s.ok('create g existing');
    s.store.seed('bad.svg', xml); s.unchangedOnError('read bad.svg');
    s.ok('undo'); assert.equal(s.editor.snapshot().shapes.length, 0);
  });
}

test('read warnings are not leaked if later SVG elements fail to parse', () => {
  const s = new Session(); s.store.seed('bad.svg', '<svg><rect/><circle r="bad"/></svg>');
  assert.equal(s.run('read bad.svg'), 'error: invalid r: bad');
});

test('filesystem adapter handles spaces/Unicode, overwrite, default read path and failed writes', () => {
  const folder = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  try {
    const path = join(folder, '图形 with spaces.svg');
    const editor = new Editor(new NodeDocumentStore());
    const cli = new CommandRouter(editor);
    assert.equal(cli.run(`read "${path}"`), `error: cannot read file: ${path}`);
    cli.run('init 100 200'); cli.run('create text t 10 20 "中文 & SVG"');
    assert.match(cli.run(`save "${path}"`), /^saved to /);
    assert.match(readFileSync(path, 'utf8'), /中文 &amp; SVG/);
    assert.match(cli.run(`read "${path}"`), /^read /);
    cli.run('move t 1 2'); assert.match(cli.run('save'), /^saved to /);
    assert.equal(new NodeDocumentStore().read(path).document.require('t').geometry().x, '11');
    assert.equal(cli.run(`save "${join(folder, 'absent', 'x.svg')}"`), `error: cannot write file: ${join(folder, 'absent', 'x.svg')}`);
    assert.equal(cli.run(`save "${folder}"`), `error: cannot write file: ${folder}`);
    assert.deepEqual(readdirSync(folder), ['图形 with spaces.svg']);
    const bad = join(folder, 'bad.svg'); writeFileSync(bad, '<svg><rect/></oops>');
    const before = editor.snapshot().shapes.length;
    assert.match(cli.run(`read "${bad}"`), /^error:/);
    assert.equal(editor.snapshot().shapes.length, before);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('real stdin/stdout CLI handles Unicode, comments, errors, EOF and quit without blocking', () => {
  const result = spawnSync(process.execPath, ['--import', 'tsx', resolve('src/main.ts')], {
    input: '# script\ninit\ncreate text t 1 2 "中文 & <完成>"\nshow t\nunknown\nquit\ncreate g ignored\n',
    encoding: 'utf8', timeout: 15000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /text="中文 & <完成>"/);
  assert.match(result.stdout, /error: unknown command: unknown/);
  assert.match(result.stdout, /bye/);
  assert.doesNotMatch(result.stdout, /ignored/);
  assert.equal(result.stderr, '');
});
