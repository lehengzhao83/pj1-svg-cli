import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('src');
const allowed: Readonly<Record<string, readonly string[]>> = {
  domain: ['domain'],
  commands: ['commands', 'domain'],
  ports: ['ports', 'domain'],
  application: ['application', 'commands', 'domain', 'ports'],
  infrastructure: ['infrastructure', 'domain', 'ports'],
  cli: ['cli', 'application', 'commands', 'domain'],
};
const files = readdirSync(root, { recursive: true }).filter(path => extname(path) === '.ts');
let imports = 0;
for (const file of files) {
  if (file === 'main.ts') continue;
  const module = file.split(/[\\/]/u)[0]!;
  const path = join(root, file);
  const ast = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const classes = ast.statements.filter(ts.isClassDeclaration);
  if (classes.length) {
    assert.equal(classes.length, 1, `one class per file: ${file}`);
    assert.equal(classes[0]!.name?.text, basename(file, '.ts'), `class/file name: ${file}`);
  }
  const inspect = (node: ts.Node): void => {
    assert.ok(!ts.isSwitchStatement(node), `unexpected switch dispatch: ${file}`);
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const target = statement.moduleSpecifier.text;
    imports++;
    if (target.startsWith('.')) {
      const dependency = relative(root, resolve(dirname(path), target)).split(/[\\/]/u)[0]!;
      assert.ok(allowed[module]?.includes(dependency), `forbidden dependency: ${file} -> ${target}`);
    } else {
      assert.ok(['cli', 'infrastructure'].includes(module), `external import in ${module}: ${target}`);
    }
  }
}
console.log(`Architecture checks passed: ${files.length} source files, ${imports} imports; dependency direction, class/file names and no switch dispatch.`);
