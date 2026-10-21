import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { Session } from './Session.js';

test('no document, help, comments and quit', () => {
  const s = new Session(false);
  for (const command of ['save a.svg', 'canvas', 'tree', 'show r', 'undo', 'redo', 'create g a', 'move r 1 2', 'delete r']) {
    assert.equal(s.run(command), "error: no document. use 'init' or 'read' first");
  }
  assert.match(s.ok('help'), /create ellipse/);
  assert.equal(s.run('  # comment'), '');
  assert.equal(s.run(' '), '');
  assert.match(s.run('unknown'), /^error: unknown command:/);
  assert.equal(s.ok('quit'), 'bye');
  assert.equal(s.router.shouldExit, true);
});

test('tokenizer preserves colors, Windows paths, quoted keywords and empty text', () => {
  const tokens = new Tokenizer().parse('create text t 0 0 "in" in scene');
  assert.equal(tokens[5]?.value, 'in');
  assert.equal(tokens[5]?.quoted, true);
  assert.deepEqual(new Tokenizer().parse('read "C:\\My Files\\x.svg"').map(t => t.value), ['read', 'C:\\My Files\\x.svg']);
  const s = new Session();
  s.ok('create g scene');
  s.ok('create text t 0 0 "in" in scene');
  s.ok('create text empty 0 0 ""');
  s.ok('create rect r 0 0 10 10 #ffffff');
  assert.match(s.ok('show t'), /text="in"/);
  assert.match(s.ok('show empty'), /text=""/);
  s.unchangedOnError('set t text "unfinished');
});

const shapes = [
  { command: 'create rect r 1 2 3 4 red', id: 'r', expected: { x: '4', y: '8', width: '6', height: '8' } },
  { command: 'create circle c 1 2 3 blue', id: 'c', expected: { cx: '4', cy: '8', r: '6' } },
  { command: 'create ellipse e 1 2 3 4', id: 'e', expected: { cx: '4', cy: '8', rx: '6', ry: '8' } },
  { command: 'create line l 1 2 3 4 black', id: 'l', expected: { x1: '4', y1: '8', x2: '8', y2: '12' } },
  { command: 'create text t 1 2 "中文 <&>"', id: 't', expected: { x: '4', y: '8' } },
];
for (const shape of shapes) {
  test(`geometry and undo/redo: ${shape.id}`, () => {
    const s = new Session();
    s.ok(shape.command);
    const before = s.xml();
    s.ok(`move ${shape.id} 1 2`);
    s.ok(`scale ${shape.id} 2`);
    assert.deepEqual(s.editor.snapshot().require(shape.id).geometry(), shape.expected);
    const after = s.xml();
    s.ok('undo'); s.ok('undo'); assert.equal(s.xml(), before);
    s.ok('redo'); s.ok('redo'); assert.equal(s.xml(), after);
    s.ok('undo'); s.ok(`set ${shape.id} fill green`);
    s.unchangedOnError('redo', 'error: nothing to redo');
  });
}

test('nested groups apply move/scale once to every leaf and share paint API', () => {
  const s = new Session();
  for (const line of ['create g outer', 'create g inner in outer', 'create rect r 1 2 3 4 in inner', 'create circle c 2 3 4 in outer', 'create text t 5 6 "hello" in inner']) s.ok(line);
  s.ok('move outer 10 -1'); s.ok('scale outer .5');
  assert.deepEqual(s.editor.snapshot().require('r').geometry(), { x: '5.5', y: '0.5', width: '1.5', height: '2' });
  assert.deepEqual(s.editor.snapshot().require('t').geometry(), { x: '7.5', y: '2.5' });
  assert.deepEqual(s.editor.snapshot().require('c').geometry(), { cx: '6', cy: '1', r: '2' });
  s.ok('set outer fill red'); s.ok('set outer stroke-width 3');
  assert.equal(s.editor.snapshot().require('outer').attributes()['stroke-width'], '3');
  assert.equal(s.editor.snapshot().require('r').attributes().fill, undefined);
});

test('case-sensitive unique ids, all parent errors and unsupported box', () => {
  const s = new Session();
  s.ok('create g A'); s.ok('create g a'); s.ok('create rect r 0 0 1 1');
  const cases = [
    ['create g a', 'error: id already exists: a'],
    ['create g child in absent', 'error: no such container: absent'],
    ['create g child in r', 'error: not a container: r'],
    ['move absent 1 2', 'error: no such shape: absent'],
    ['create box b 0 0 1 1 title', 'error: unknown shape type: box (is the plugin loaded?)'],
    ['set r id new', 'error: unknown attribute: id'],
    ['set A x 1', 'error: unknown attribute: x'],
    ['set r text nope', 'error: unknown attribute: text'],
  ];
  for (const [line, expected] of cases) s.unchangedOnError(line!, expected!);
});

test('all shape geometry attributes can be set; whitelist is type-specific', () => {
  const s = new Session();
  for (const item of shapes) {
    s.ok(item.command);
    const geometry = s.editor.snapshot().require(item.id).geometry();
    for (const key of Object.keys(geometry)) {
      s.ok(`set ${item.id} ${key} 9.5`);
      assert.equal(s.editor.snapshot().require(item.id).geometry()[key], '9.5');
    }
    s.ok(`set ${item.id} stroke black`);
    s.ok(`set ${item.id} stroke-width 0`);
    s.unchangedOnError(`set ${item.id} font-size 16`, 'error: unknown attribute: font-size');
  }
  s.ok('set t text "updated 中文"');
  assert.equal(s.editor.snapshot().require('t').text, 'updated 中文');
});

test('defaults omit optional paints; signed, decimal and exponent numbers work', () => {
  const s = new Session();
  s.ok('init 100'); assert.equal(s.editor.snapshot().height, 600);
  s.ok('create line l -1 .5 +2 1e2');
  assert.equal(s.editor.snapshot().require('l').attributes().stroke, undefined);
  s.ok('create rect r 0 0 0 0');
  assert.equal(s.editor.snapshot().require('r').attributes().fill, undefined);
  s.ok('set r x -0'); assert.equal(s.editor.snapshot().require('r').geometry().x, '0');
});

for (const line of [
  'scale r 0', 'scale r -1', 'scale r NaN', 'move r Infinity 0', 'move r 1px 0',
  'move r 0x10 0', 'move r "" 0', 'set r width -1', 'set r height NaN',
  'set r stroke-width -1', 'create circle bad 0 0 -1', 'create rect bad 0 0 -1 1',
  'create ellipse bad 0 0 1 -1', 'create g "bad id"', 'create g "bad<id"',
  'create g bad extra', 'create rect bad 0 0 1', 'init -1 2', 'canvas 1', 'canvas 1 -1',
  'move r 1 2 3', 'set r fill ""', 'save "unwritable path.svg"',
]) {
  test(`invalid command is atomic: ${line}`, () => {
    const s = new Session(); s.ok('create rect r 1 2 3 4');
    s.unchangedOnError(line);
    s.ok('undo'); assert.equal(s.editor.snapshot().shapes.length, 0);
  });
}

test('group overflow after an earlier child mutation rolls back the entire command', () => {
  const s = new Session();
  s.ok('create g g'); s.ok('create rect small 1 1 1 1 in g'); s.ok('create circle large 1e308 1 1 in g');
  s.unchangedOnError('scale g 2', 'error: number must be finite');
  s.ok('undo'); assert.equal(s.editor.snapshot().find('large'), undefined);
});

test('display queries and failed edits preserve redo; new edits clear it', () => {
  const s = new Session(); s.ok('create g g'); s.ok('create rect r 1 2 3 4 in g');
  s.ok('undo'); s.ok('tree'); s.ok('help'); s.ok('canvas'); s.ok('show g');
  s.unchangedOnError('delete missing'); s.ok('redo');
  assert.ok(s.editor.snapshot().find('r'));
  s.ok('undo'); s.ok('create circle c 1 2 3');
  s.unchangedOnError('redo', 'error: nothing to redo');
});

test('group preserves drawing order and undo restores exact parents and sibling slots', () => {
  const s = new Session();
  ['create g p', 'create rect a 0 0 1 1 in p', 'create circle b 0 0 1 in p', 'create text c 0 0 "C" in p', 'create g q', 'create line d 0 0 1 1 in q'].forEach(line => s.ok(line));
  const original = s.xml(); s.ok('group collected d c a');
  assert.deepEqual(s.editor.snapshot().require('collected').children.map(node => node.id), ['a', 'c', 'd']);
  assert.equal(s.editor.snapshot().require('collected').parent?.id, 'p');
  assert.deepEqual(s.editor.snapshot().require('p').children.map(node => node.id), ['collected', 'b']);
  const grouped = s.xml(); s.ok('undo'); assert.equal(s.xml(), original);
  s.ok('redo'); assert.equal(s.xml(), grouped);
});

test('group/addto cycles, overlapping members and duplicates are rejected atomically', () => {
  const s = new Session(); s.ok('create g outer'); s.ok('create g inner in outer'); s.ok('create rect r 0 0 1 1 in inner');
  s.unchangedOnError('group bad r outer', 'error: cannot group a container into its own descendant: outer');
  s.unchangedOnError('group bad inner inner', 'error: duplicate group member');
  s.unchangedOnError('addto inner outer'); s.unchangedOnError('addto outer outer');
  s.unchangedOnError('group bad r missing');
  s.ok('addto outer r');
  assert.deepEqual(s.editor.snapshot().require('outer').children.map(node => node.id), ['inner', 'r']);
  s.ok('undo'); assert.equal(s.editor.snapshot().require('r').parent?.id, 'inner');
});

test('ungroup occupies original slot, inherits paint, allows empty group, forbids root level', () => {
  const s = new Session();
  ['create g outer', 'create g inner in outer', 'create rect a 0 0 1 1 in inner', 'create circle b 0 0 1 blue in inner', 'create g end in outer', 'set inner fill red'].forEach(line => s.ok(line));
  const before = s.xml(); s.ok('ungroup inner');
  assert.deepEqual(s.editor.snapshot().require('outer').children.map(node => node.id), ['a', 'b', 'end']);
  assert.equal(s.editor.snapshot().require('a').attributes().fill, 'red');
  assert.equal(s.editor.snapshot().require('b').attributes().fill, 'blue');
  s.ok('undo'); assert.equal(s.xml(), before); s.ok('redo');
  s.ok('ungroup end');
  s.unchangedOnError('ungroup outer', 'error: cannot ungroup top-level container: outer');
  s.unchangedOnError('ungroup a', 'error: not a container: a');
});

test('delete subtrees and z-order changes are single undo units', () => {
  const s = new Session();
  ['create g p', 'create g g in p', 'create rect r 0 0 1 1 in g', 'create circle c 0 0 1 in p', 'create text t 0 0 "T" in p'].forEach(line => s.ok(line));
  const before = s.xml(); s.ok('front g');
  assert.deepEqual(s.editor.snapshot().require('p').children.map(n => n.id), ['c', 't', 'g']);
  s.ok('back t'); assert.deepEqual(s.editor.snapshot().require('p').children.map(n => n.id), ['t', 'c', 'g']);
  s.ok('undo'); s.ok('undo'); assert.equal(s.xml(), before);
  s.ok('delete g'); assert.equal(s.editor.snapshot().find('r'), undefined);
  s.ok('undo'); assert.equal(s.xml(), before);
  s.ok('delete p'); assert.equal(s.editor.snapshot().shapes.length, 0);
  s.ok('undo'); assert.equal(s.xml(), before);
});

test('tree includes geometry, subtree and show include correct parent', () => {
  const s = new Session(); s.ok('create g p'); s.ok('create rect r 1 2 3 4 red in p');
  assert.equal(s.ok('tree'), 'svg (800x600)\n└── g#p\n    └── rect#r  x=1 y=2 w=3 h=4 fill=red');
  assert.equal(s.ok('tree p'), 'g#p\n└── rect#r  x=1 y=2 w=3 h=4 fill=red');
  assert.match(s.ok('show r'), /^rect#r  parent=g#p\n/);
  assert.match(s.ok('show p'), /^g#p  parent=svg/);
});

for (const line of ['init', 'read source.svg', 'save saved.svg', 'canvas 100 200']) {
  test(`IO history barrier: ${line}`, () => {
    const s = new Session(); s.store.seed('source.svg', '<svg width="10" height="20"><g id="loaded"/></svg>');
    s.ok('create g g'); s.ok(line);
    s.unchangedOnError('undo', 'error: undo not allowed after io command');
    s.unchangedOnError('redo', 'error: undo not allowed after io command');
    s.ok('create g next'); s.ok('undo');
    s.unchangedOnError('undo', 'error: nothing to undo');
    s.ok('redo');
  });
}

test('failed IO keeps document, file association, undo and redo; successful save remembers path', () => {
  const s = new Session(); s.ok('create g original'); s.ok('save "my file.svg"'); s.ok('create g next');
  s.store.seed('bad.svg', '<svg><g id="broken"></svg>');
  for (const line of ['read missing.svg', 'read bad.svg', 'save unwritable.svg']) s.unchangedOnError(line);
  s.ok('undo'); s.unchangedOnError('read missing.svg'); s.ok('redo');
  s.ok('save'); assert.equal(s.store.read('my file.svg').document.shapes.length, 2);
  s.ok('init'); s.unchangedOnError('save', 'error: no file path. use save <file.svg>');
});

test('snapshot cannot mutate active editor; invalid XML characters are rejected before commit', () => {
  const s = new Session(); s.ok('create text t 0 0 "text"');
  s.editor.snapshot().require('t').move(100, 200);
  assert.deepEqual(s.editor.snapshot().require('t').geometry(), { x: '0', y: '0' });
  s.unchangedOnError('set t text "bad\u0000"', 'error: invalid XML character');
});
