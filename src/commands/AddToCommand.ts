import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  constructor(private readonly gid: string, private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const group = document.container(this.gid);
    const shape = document.require(this.id);
    if (shape.contains(group)) throw new Error(`cannot move a container into its own descendant: ${shape.id}`);
    shape.parent!.remove(shape); group.insert(shape);
    return `${shape.label} added to ${group.label}`;
  }
}
