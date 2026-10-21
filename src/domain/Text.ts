import { GeometricShape } from './GeometricShape.js';

export class Text extends GeometricShape {
  override readonly tag = 'text';
  constructor(id: string, x: number, y: number, private content: string) {
    super(id, { x, y }, ['x'], ['y'], []);
  }
  override get text(): string { return this.content; }
  override set(attribute: string, value: string): void {
    if (attribute === 'text') { this.content = value; return; }
    super.set(attribute, value);
  }
  override clone(): Text {
    const shape = new Text(this.id, this.value('x'), this.value('y'), this.content);
    this.copyStyles(shape);
    return shape;
  }
  override summary(): string {
    return `${this.label}  ${this.point('x', 'y')} ${JSON.stringify(this.content)}${this.styleSummary()}`;
  }
}
