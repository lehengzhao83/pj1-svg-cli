import type { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import { XmlValue } from './XmlValue.js';

export abstract class Shape {
  private owner: Group | undefined;
  private readonly styles = new Map<string, string>();

  protected constructor(private readonly identifier: string) {
    XmlValue.assert(identifier);
    if (!identifier || /[\s<>"'=&]/u.test(identifier)) throw new Error(`invalid id: ${identifier}`);
  }

  abstract readonly tag: string;
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract clone(): Shape;
  abstract geometry(): Readonly<Record<string, string>>;
  abstract summary(): string;

  get id(): string { return this.identifier; }
  get parent(): Group | undefined { return this.owner; }
  get label(): string { return `${this.tag}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get text(): string | undefined { return undefined; }
  contains(shape: Shape): boolean { return this === shape; }

  /** Parent bookkeeping is only called by Group.insert/remove. */
  attach(parent: Group | undefined): void { this.owner = parent; }

  set(attribute: string, value: string): void {
    XmlValue.assert(value);
    if (!['fill', 'stroke', 'stroke-width'].includes(attribute)) {
      throw new Error(`unknown attribute: ${attribute}`);
    }
    if (attribute === 'stroke-width') {
      const width = Numbers.parse(value, attribute);
      if (width < 0) throw new Error('stroke-width must be non-negative');
      value = Numbers.format(width);
    }
    if (!value.trim() || /[\r\n]/u.test(value)) throw new Error(`invalid ${attribute}`);
    this.styles.set(attribute, value);
  }

  attributes(): Readonly<Record<string, string>> {
    return { id: this.id, ...this.geometry(), ...Object.fromEntries(this.styles) };
  }

  protected styleSummary(): string {
    return [...this.styles].map(([key, value]) => ` ${key}=${value}`).join('');
  }

  protected copyStyles(target: Shape): void {
    for (const [key, value] of this.styles) target.set(key, value);
  }
}
