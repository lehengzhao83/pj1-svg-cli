import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import { Shape } from './Shape.js';
import { ShapeDefinition } from './ShapeDefinition.js';
import { Text } from './Text.js';

export class ShapeFactory {
  // Phase 1 type-name dispatch boundary; replace built-ins with provider registration in Phase 2.
  private readonly definitions = new Map<string, ShapeDefinition>([
    ['rect', new ShapeDefinition(['x', 'y', 'width', 'height'], (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!), 'fill')],
    ['circle', new ShapeDefinition(['cx', 'cy', 'r'], (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!), 'fill')],
    ['ellipse', new ShapeDefinition(['cx', 'cy', 'rx', 'ry'], (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!), 'fill')],
    ['line', new ShapeDefinition(['x1', 'y1', 'x2', 'y2'], (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!), 'stroke')],
    ['text', new ShapeDefinition(['x', 'y'], (id, n, text) => new Text(id, n[0]!, n[1]!, text), undefined, true)],
    ['g', new ShapeDefinition([], id => new Group(id))],
  ]);

  create(type: string, id: string, args: readonly string[]): Shape { return this.definition(type).create(id, args); }
  import(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    return this.definition(type).import(id, attributes, text);
  }
  private definition(type: string): ShapeDefinition {
    const definition = this.definitions.get(type);
    if (!definition) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
}
