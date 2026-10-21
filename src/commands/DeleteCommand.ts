import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class DeleteCommand extends EditCommand {
  constructor(private readonly id: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const shape = document.require(this.id);
    shape.parent!.remove(shape);
    return `${shape.label} deleted`;
  }
}
