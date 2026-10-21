import { Group } from '../domain/Group.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const group = document.require(this.id);
    if (!(group instanceof Group)) throw new Error(`not a container: ${this.id}`);
    const parent = group.parent!;
    if (parent === document.root) throw new Error(`cannot ungroup top-level container: ${this.id}`);
    const index = parent.remove(group);
    const children = group.children;
    children.forEach((child, offset) => {
      // Materialize inherited group paint before removing its scope.
      for (const [key, value] of Object.entries(group.attributes())) {
        if (key !== 'id' && child.attributes()[key] === undefined) child.set(key, value);
      }
      group.remove(child); parent.insert(child, index + offset);
    });
    return `${group.label} ungrouped (${children.length} children)`;
  }
}
