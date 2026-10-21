import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class SvgDocument {
  private rootNode = new Group('__canvas_internal__');

  constructor(private canvasWidth = 800, private canvasHeight = 600) {
    this.resize(canvasWidth, canvasHeight);
  }

  get width(): number { return this.canvasWidth; }
  get height(): number { return this.canvasHeight; }
  get root(): Group { return this.rootNode; }
  get shapes(): readonly Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => { result.push(shape); shape.children.forEach(visit); };
    this.root.children.forEach(visit);
    return result;
  }

  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width'); Numbers.positive(height, 'canvas height');
    this.canvasWidth = width; this.canvasHeight = height;
  }

  find(id: string): Shape | undefined { return this.shapes.find(shape => shape.id === id); }
  require(id: string): Shape {
    const shape = this.find(id);
    if (!shape) throw new Error(`no such shape: ${id}`);
    return shape;
  }
  container(id: string): Group {
    const shape = this.find(id);
    if (!shape) throw new Error(`no such container: ${id}`);
    if (!(shape instanceof Group)) throw new Error(`not a container: ${id}`);
    return shape;
  }
  assertFree(id: string): void {
    if (this.find(id)) throw new Error(`id already exists: ${id}`);
  }
  add(shape: Shape, parent = this.root): void {
    const ids = new Set<string>();
    const visit = (node: Shape): void => {
      this.assertFree(node.id);
      if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
      ids.add(node.id); node.children.forEach(visit);
    };
    visit(shape); parent.insert(shape);
  }

  clone(): SvgDocument {
    const document = new SvgDocument(this.width, this.height);
    document.rootNode = this.root.clone();
    return document;
  }
}
