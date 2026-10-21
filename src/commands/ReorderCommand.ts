import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class ReorderCommand extends EditCommand {
  constructor(private readonly id: string, private readonly front: boolean) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id);
    const parent = shape.parent!;
    parent.remove(shape); parent.insert(shape, this.front ? parent.children.length : 0);
    return `${shape.label} sent to ${this.front ? 'front' : 'back'}`;
  }
}
