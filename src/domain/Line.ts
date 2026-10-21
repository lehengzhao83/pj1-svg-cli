import { GeometricShape } from './GeometricShape.js';

export class Line extends GeometricShape {
  override readonly tag = 'line';
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) {
    super(id, { x1, y1, x2, y2 }, ["x1","x2"], ["y1","y2"], []);
  }
  override clone(): Line {
    const shape = new Line(this.id, this.value('x1'), this.value('y1'), this.value('x2'), this.value('y2'));
    this.copyStyles(shape);
    return shape;
  }
  override summary(): string { return this.label + '  ' + `${this.point('x1', 'y1')} -> ${this.point('x2', 'y2')}` + this.styleSummary(); }
}

