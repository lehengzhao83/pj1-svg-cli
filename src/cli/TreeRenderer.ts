import { Shape } from '../domain/Shape.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class TreeRenderer {
  tree(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    const branch = (shape: Shape, prefix: string, last: boolean): void => {
      lines.push(prefix + (last ? '└── ' : '├── ') + shape.summary());
      shape.children.forEach((child, index, children) => branch(child, prefix + (last ? '    ' : '│   '), index === children.length - 1));
    };
    if (id !== undefined) {
      const shape = document.require(id);
      lines.push(shape.summary());
      shape.children.forEach((child, index, children) => branch(child, '', index === children.length - 1));
    } else {
      lines.push(`svg (${document.width}x${document.height})`);
      document.root.children.forEach((child, index, children) => branch(child, '', index === children.length - 1));
    }
    return lines.join('\n');
  }
  show(document: SvgDocument, id: string): string {
    const shape = document.require(id);
    const parent = shape.parent === document.root ? 'svg' : shape.parent!.label;
    const attrs = Object.entries(shape.attributes()).filter(([name]) => name !== 'id').map(([name, value]) => `  ${name}=${value}`);
    if (shape.text !== undefined) attrs.push(`  text=${JSON.stringify(shape.text)}`);
    return [`${shape.label}  parent=${parent}`, ...attrs].join('\n');
  }
}
