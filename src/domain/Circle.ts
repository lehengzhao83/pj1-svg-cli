import { GeometricShape } from './GeometricShape.js';

export class Circle extends GeometricShape {
  override readonly tag = 'circle';
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, ["cx"], ["cy"], ["r"]);
  }
  override clone(): Circle {
    const shape = new Circle(this.id, this.value('cx'), this.value('cy'), this.value('r'));
    this.copyStyles(shape);
    return shape;
  }
  override summary(): string { return this.label + '  ' + `cx=${this.value('cx')} cy=${this.value('cy')} r=${this.value('r')}` + this.styleSummary(); }
}

