import { Shape } from '../domain/Shape.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  constructor(private readonly shape: Shape, private readonly containerId?: string) { super(); }
  protected override apply(document: SvgDocument): string {
    const parent = this.containerId === undefined ? document.root : document.container(this.containerId);
    document.add(this.shape.clone(), parent);
    return `${this.shape.label} created${this.containerId === undefined ? '' : ` in ${parent.label}`}`;
  }
}
