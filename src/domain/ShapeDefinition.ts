import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

/** Constructor schema shared by CLI creation and SVG import. */
export class ShapeDefinition {
  constructor(
    private readonly fields: readonly string[],
    private readonly builder: (id: string, numbers: number[], text: string) => Shape,
    private readonly paint?: string,
    private readonly hasText = false,
  ) {}

  create(id: string, args: readonly string[]): Shape {
    const required = this.fields.length + (this.hasText ? 1 : 0);
    if (args.length < required || args.length > required + (this.paint ? 1 : 0)) {
      throw new Error(`invalid shape parameters: expected ${required}${this.paint ? ` or ${required + 1}` : ''}`);
    }
    const values = this.fields.map((name, index) => Numbers.parse(args[index]!, name));
    const shape = this.builder(id, values, this.hasText ? args[this.fields.length]! : '');
    if (this.paint && args[required] !== undefined) shape.set(this.paint, args[required]!);
    return shape;
  }

  import(id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const values = this.fields.map(name => Numbers.parse(attributes[name] ?? '0', name));
    const shape = this.builder(id, values, text);
    const supported = new Set(['id', ...this.fields, 'fill', 'stroke', 'stroke-width']);
    for (const [name, value] of Object.entries(attributes)) {
      if (!supported.has(name)) throw new Error(`unsupported SVG attribute: ${name}`);
      if (name !== 'id' && !this.fields.includes(name)) shape.set(name, value);
    }
    return shape;
  }
}
