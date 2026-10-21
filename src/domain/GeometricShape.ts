import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export abstract class GeometricShape extends Shape {
  private readonly values = new Map<string, number>();

  protected constructor(
    id: string,
    geometry: Readonly<Record<string, number>>,
    private readonly xCoordinates: readonly string[],
    private readonly yCoordinates: readonly string[],
    private readonly lengths: readonly string[],
  ) {
    super(id);
    for (const [name, value] of Object.entries(geometry)) {
      this.validate(name, value);
      this.values.set(name, value);
    }
  }

  override set(attribute: string, value: string): void {
    if (!this.values.has(attribute)) return super.set(attribute, value);
    const number = Numbers.parse(value, attribute);
    this.validate(attribute, number);
    this.values.set(attribute, number);
  }

  override move(dx: number, dy: number): void {
    Numbers.finite(dx); Numbers.finite(dy);
    const next = new Map(this.values);
    for (const name of this.xCoordinates) next.set(name, Numbers.finite(this.value(name) + dx));
    for (const name of this.yCoordinates) next.set(name, Numbers.finite(this.value(name) + dy));
    for (const [name, value] of next) this.values.set(name, value);
  }

  override scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    const next = [...this.values].map(([name, value]) => [name, Numbers.finite(value * factor)] as const);
    for (const [name, value] of next) this.values.set(name, value);
  }

  override geometry(): Readonly<Record<string, string>> {
    return Object.fromEntries([...this.values].map(([key, value]) => [key, Numbers.format(value)]));
  }

  protected value(name: string): number { return this.values.get(name)!; }
  protected point(x: string, y: string): string {
    return `(${Numbers.format(this.value(x))},${Numbers.format(this.value(y))})`;
  }

  private validate(name: string, value: number): void {
    Numbers.finite(value, name);
    if (this.lengths.includes(name) && value < 0) throw new Error(`${name} must be non-negative`);
  }
}
