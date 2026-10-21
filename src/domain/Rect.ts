import { GeometricShape } from './GeometricShape.js';

export class Rect extends GeometricShape {
  override readonly tag = 'rect';
  constructor(id: string, x: number, y: number, width: number, height: number) {
    super(id, { x, y, width, height }, ["x"], ["y"], ["width","height"]);
  }
  override clone(): Rect {
    const shape = new Rect(this.id, this.value('x'), this.value('y'), this.value('width'), this.value('height'));
    this.copyStyles(shape);
    return shape;
  }
  override summary(): string { return this.label + '  ' + `x=${this.value('x')} y=${this.value('y')} w=${this.value('width')} h=${this.value('height')}` + this.styleSummary(); }
}

