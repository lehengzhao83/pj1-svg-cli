import { Group } from '../domain/Group.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) { super(); }
  protected override apply(document: SvgDocument): string {
    document.assertFree(this.id);
    if (!this.ids.length) throw new Error('group requires at least one shape');
    if (new Set(this.ids).size !== this.ids.length) throw new Error('duplicate group member');
    const requested = this.ids.map(id => document.require(id));
    for (const shape of requested) {
      if (requested.some(other => other !== shape && shape.contains(other))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    // Tree preorder defines stable relative drawing order, independent of argument order.
    const selected = document.shapes.filter(shape => requested.includes(shape));
    const parent = selected[0]!.parent!;
    const index = parent.children.indexOf(selected[0]!);
    const group = new Group(this.id);
    for (const shape of selected) { shape.parent!.remove(shape); group.insert(shape); }
    parent.insert(group, index);
    return `${group.label} created with ${selected.length} children`;
  }
}
