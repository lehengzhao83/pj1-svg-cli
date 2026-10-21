import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { Group } from '../domain/Group.js';
import { Numbers } from '../domain/Numbers.js';
import { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';

export class SvgCodec {
  private readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): { document: SvgDocument; warnings: readonly string[] } {
    if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('invalid SVG: DTD and entities are unsupported');
    const errors: string[] = [];
    const xml = new DOMParser({
      errorHandler: {
        warning: message => { errors.push(message); },
        error: message => { errors.push(message); },
        fatalError: message => { errors.push(message); },
      },
    }).parseFromString(source, 'image/svg+xml');
    if (errors.length || !xml.documentElement) throw new Error('invalid SVG: malformed XML');
    const root = xml.documentElement;
    if (root.tagName !== 'svg' || (root.namespaceURI && root.namespaceURI !== this.namespace)) {
      throw new Error('invalid SVG: expected <svg> root');
    }
    const document = new SvgDocument(this.dimension(root.getAttribute('width'), 800), this.dimension(root.getAttribute('height'), 600));
    const rootAllowed = new Set(['xmlns', 'width', 'height', 'viewBox', 'version', 'fill', 'stroke', 'stroke-width']);
    for (const attribute of Array.from(root.attributes)) {
      if (!rootAllowed.has(attribute.name)) throw new Error(`unsupported SVG attribute: ${attribute.name}`);
      if (['fill', 'stroke', 'stroke-width'].includes(attribute.name)) document.root.set(attribute.name, attribute.value);
    }
    if (root.hasAttribute('viewBox')) {
      const values = root.getAttribute('viewBox')!.trim().split(/[\s,]+/u).map(value => Numbers.parse(value, 'viewBox'));
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== document.width || values[3] !== document.height) {
        throw new Error('unsupported SVG viewBox: expected 0 0 width height');
      }
    }
    const ids = new Set<string>();
    const reserve = (element: Element): void => {
      const id = element.getAttribute('id');
      if (id) {
        if (ids.has(id)) throw new Error(`id already exists: ${id}`);
        ids.add(id);
      }
      for (const child of Array.from(element.childNodes)) if (child.nodeType === 1) reserve(child as Element);
    };
    for (const child of Array.from(root.childNodes)) if (child.nodeType === 1) reserve(child as Element);
    const warnings: string[] = [];
    const append = (element: Element, parent: Group): void => {
      if (element.namespaceURI && element.namespaceURI !== this.namespace) throw new Error('unsupported SVG namespace');
      const tag = element.tagName;
      let id = element.getAttribute('id');
      if (!id) {
        let index = 1;
        while (ids.has(`${tag}${index}`)) index++;
        id = `${tag}${index}`; ids.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
      }
      const attrs = Object.fromEntries(Array.from(element.attributes).map(attr => [attr.name, attr.value]));
      const shape = this.factory.import(tag, id, attrs, element.textContent ?? '');
      document.add(shape, parent);
      for (const child of Array.from(element.childNodes)) {
        if (child.nodeType === 1) {
          if (!(shape instanceof Group)) throw new Error(`unsupported child element in <${tag}>`);
          append(child as Element, shape);
        } else if ((child.nodeType === 3 || child.nodeType === 4) && child.nodeValue?.trim() && shape.text === undefined) {
          throw new Error(`unexpected text in <${tag}>`);
        }
      }
    };
    for (const child of Array.from(root.childNodes)) {
      if (child.nodeType === 1) append(child as Element, document.root);
      else if ((child.nodeType === 3 || child.nodeType === 4) && child.nodeValue?.trim()) throw new Error('unexpected text in <svg>');
    }
    return { document, warnings };
  }

  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(this.namespace, 'svg', null);
    const root = xml.documentElement;
    root.setAttribute('xmlns', this.namespace);
    root.setAttribute('width', Numbers.format(document.width));
    root.setAttribute('height', Numbers.format(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    for (const [key, value] of Object.entries(document.root.attributes())) if (key !== 'id') root.setAttribute(key, value);
    const append = (shape: Shape, parent: Element): void => {
      const element = xml.createElementNS(this.namespace, shape.tag);
      for (const [key, value] of Object.entries(shape.attributes())) element.setAttribute(key, value);
      if (shape.text !== undefined) element.appendChild(xml.createTextNode(shape.text));
      parent.appendChild(element);
      for (const child of shape.children) append(child, element as unknown as Element);
    };
    for (const shape of document.root.children) append(shape, root as unknown as Element);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(xml) + '\n';
  }

  private dimension(value: string | null, fallback: number): number {
    return value ? Numbers.parse(value.replace(/px$/u, ''), 'canvas dimension') : fallback;
  }
}
