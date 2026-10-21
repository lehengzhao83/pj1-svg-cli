import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Group extends Shape {
  override readonly tag = 'g';
  private readonly items: Shape[] = [];

  constructor(id: string) { super(id); }
  override get children(): readonly Shape[] { return [...this.items]; }

  insert(shape: Shape, index = this.items.length): void {
    if (shape === this || shape.contains(this)) throw new Error('cannot move a container into its own descendant');
    if (shape.parent) throw new Error(`shape already has a parent: ${shape.id}`);
    this.items.splice(index, 0, shape);
    shape.attach(this);
  }

  remove(shape: Shape): number {
    const index = this.items.indexOf(shape);
    if (index < 0) throw new Error(`no such child: ${shape.id}`);
    this.items.splice(index, 1);
    shape.attach(undefined);
    return index;
  }

  override contains(shape: Shape): boolean {
    return this === shape || this.items.some(child => child.contains(shape));
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx); Numbers.finite(dy);
    for (const child of this.items) child.move(dx, dy);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    for (const child of this.items) child.scale(factor);
  }

  override clone(): Group {
    const group = new Group(this.id);
    this.copyStyles(group);
    for (const child of this.items) group.insert(child.clone());
    return group;
  }

  override geometry(): Readonly<Record<string, string>> { return {}; }
  override summary(): string { return this.label + this.styleSummary(); }
}
