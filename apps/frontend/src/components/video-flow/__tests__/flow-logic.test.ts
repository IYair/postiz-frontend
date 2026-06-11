import { describe, it, expect } from 'vitest';
import {
  validateConnection,
  wouldCreateCycle,
  topologicalOrder,
  resolveVideoMode,
  HANDLE,
  type FlowNodeLite,
  type FlowEdgeLite,
} from '../flow-logic';

const nodes: FlowNodeLite[] = [
  { id: 't1', type: 'text' },
  { id: 'i1', type: 'image' },
  { id: 'i2', type: 'image' },
  { id: 'v1', type: 'video' },
  { id: 'v2', type: 'video' },
];

const edge = (
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string
): FlowEdgeLite => ({ source, sourceHandle, target, targetHandle });

describe('validateConnection', () => {
  it('acepta los pares de handles permitidos', () => {
    expect(validateConnection(edge('t1', HANDLE.promptOut, 'v1', HANDLE.promptIn), nodes, [])).toBeNull();
    expect(validateConnection(edge('t1', HANDLE.promptOut, 'i1', HANDLE.promptIn), nodes, [])).toBeNull();
    expect(validateConnection(edge('i1', HANDLE.imageOut, 'v1', HANDLE.startIn), nodes, [])).toBeNull();
    expect(validateConnection(edge('v1', HANDLE.videoOut, 'v2', HANDLE.startIn), nodes, [])).toBeNull();
    expect(validateConnection(edge('i1', HANDLE.imageOut, 'v1', HANDLE.refIn), nodes, [])).toBeNull();
  });

  it('rechaza pares incompatibles y self-connections', () => {
    expect(validateConnection(edge('t1', HANDLE.promptOut, 'v1', HANDLE.startIn), nodes, [])).toBe('incompatible connection');
    expect(validateConnection(edge('v1', HANDLE.videoOut, 'v1', HANDLE.startIn), nodes, [])).toBe('cannot connect a node to itself');
    expect(validateConnection(edge('v1', HANDLE.videoOut, 'v2', HANDLE.refIn), nodes, [])).toBe('incompatible connection');
  });

  it('limita prompt-in y start-in a 1 edge', () => {
    const existing = [edge('t1', HANDLE.promptOut, 'v1', HANDLE.promptIn)];
    expect(validateConnection(edge('t1', HANDLE.promptOut, 'v1', HANDLE.promptIn), nodes, existing)).toBe('prompt input already connected');
    const existingStart = [edge('i1', HANDLE.imageOut, 'v1', HANDLE.startIn)];
    expect(validateConnection(edge('i2', HANDLE.imageOut, 'v1', HANDLE.startIn), nodes, existingStart)).toBe('start frame input already connected');
  });

  it('limita ref-in a 3 edges', () => {
    const refs = [
      edge('i1', HANDLE.imageOut, 'v1', HANDLE.refIn),
      edge('i2', HANDLE.imageOut, 'v1', HANDLE.refIn),
      edge('i1', HANDLE.imageOut, 'v1', HANDLE.refIn),
    ];
    expect(validateConnection(edge('i2', HANDLE.imageOut, 'v1', HANDLE.refIn), nodes, refs)).toBe('max 3 reference images');
  });

  it('start-in y ref-in son excluyentes (restriccion SDK Veo)', () => {
    const withStart = [edge('i1', HANDLE.imageOut, 'v1', HANDLE.startIn)];
    expect(validateConnection(edge('i2', HANDLE.imageOut, 'v1', HANDLE.refIn), nodes, withStart)).toBe('references and start frame are mutually exclusive');
    const withRef = [edge('i1', HANDLE.imageOut, 'v1', HANDLE.refIn)];
    expect(validateConnection(edge('i2', HANDLE.imageOut, 'v1', HANDLE.startIn), nodes, withRef)).toBe('references and start frame are mutually exclusive');
  });

  it('rechaza ciclos', () => {
    const chain = [edge('v1', HANDLE.videoOut, 'v2', HANDLE.startIn)];
    expect(validateConnection(edge('v2', HANDLE.videoOut, 'v1', HANDLE.startIn), nodes, chain)).toBe('connection would create a cycle');
  });
});

describe('wouldCreateCycle', () => {
  it('detecta ciclo transitivo', () => {
    const edges = [
      edge('v1', HANDLE.videoOut, 'v2', HANDLE.startIn),
    ];
    expect(wouldCreateCycle(edge('v2', HANDLE.videoOut, 'v1', HANDLE.startIn), edges)).toBe(true);
    expect(wouldCreateCycle(edge('i1', HANDLE.imageOut, 'v1', HANDLE.startIn), edges)).toBe(false);
  });
});

describe('topologicalOrder', () => {
  it('ordena dependencias antes que dependientes', () => {
    const edges = [
      edge('t1', HANDLE.promptOut, 'i1', HANDLE.promptIn),
      edge('i1', HANDLE.imageOut, 'v1', HANDLE.startIn),
      edge('v1', HANDLE.videoOut, 'v2', HANDLE.startIn),
    ];
    const order = topologicalOrder(nodes, edges);
    expect(order.indexOf('t1')).toBeLessThan(order.indexOf('i1'));
    expect(order.indexOf('i1')).toBeLessThan(order.indexOf('v1'));
    expect(order.indexOf('v1')).toBeLessThan(order.indexOf('v2'));
    expect(order).toHaveLength(5);
  });

  it('lanza si hay ciclo', () => {
    const cyclic = [
      edge('v1', HANDLE.videoOut, 'v2', HANDLE.startIn),
      edge('v2', HANDLE.videoOut, 'v1', HANDLE.startIn),
    ];
    expect(() => topologicalOrder(nodes, cyclic)).toThrow('cycle');
  });
});

describe('resolveVideoMode', () => {
  it('ingredients > frames > text', () => {
    expect(resolveVideoMode(false, 2)).toBe('ingredients');
    expect(resolveVideoMode(true, 0)).toBe('frames');
    expect(resolveVideoMode(false, 0)).toBe('text');
  });
});
