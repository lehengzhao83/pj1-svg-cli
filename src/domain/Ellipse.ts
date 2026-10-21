import { GeometricShape } from './GeometricShape.js';

export class Ellipse extends GeometricShape {
  override readonly tag = 'ellipse';
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) {
    super(id, { cx, cy, rx, ry }, ["cx"], ["cy"], ["rx","ry"]);
  }
  override clone(): Ellipse {
    const shape = new Ellipse(this.id, this.value('cx'), this.value('cy'), this.value('rx'), this.value('ry'));
    this.copyStyles(shape);
    return shape;
  }
  override summary(): string { return this.label + '  ' + `cx=${this.value('cx')} cy=${this.value('cy')} rx=${this.value('rx')} ry=${this.value('ry')}` + this.styleSummary(); }
}

