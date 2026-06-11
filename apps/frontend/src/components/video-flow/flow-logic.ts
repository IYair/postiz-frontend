// Logica pura del grafo del editor de nodos. Sin imports de @xyflow ni
// alias @gitroom/* para que vitest zero-config pueda ejecutarla.

export interface ImageRef {
  mimeType: string;
  base64: string;
}

export type FlowNodeType = 'text' | 'image' | 'video';
export type NodeStatus = 'idle' | 'running' | 'done' | 'error';
export type VideoNodeMode = 'text' | 'frames' | 'ingredients';

export interface FlowNodeLite {
  id: string;
  type: FlowNodeType;
}

export interface FlowEdgeLite {
  id?: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
}

export const HANDLE = {
  promptOut: 'prompt-out',
  imageOut: 'image-out',
  videoOut: 'video-out',
  promptIn: 'prompt-in',
  startIn: 'start-in',
  refIn: 'ref-in',
} as const;

export const MAX_REFERENCE_EDGES = 3;

const ALLOWED_PAIRS = new Set([
  `${HANDLE.promptOut}->${HANDLE.promptIn}`,
  `${HANDLE.imageOut}->${HANDLE.startIn}`,
  `${HANDLE.videoOut}->${HANDLE.startIn}`,
  `${HANDLE.imageOut}->${HANDLE.refIn}`,
]);

// Devuelve un mensaje de error, o null si la conexion es valida.
export function validateConnection(
  conn: FlowEdgeLite,
  nodes: FlowNodeLite[],
  edges: FlowEdgeLite[]
): string | null {
  const source = nodes.find((n) => n.id === conn.source);
  const target = nodes.find((n) => n.id === conn.target);
  if (!source || !target) return 'invalid nodes';
  if (conn.source === conn.target) return 'cannot connect a node to itself';

  if (!ALLOWED_PAIRS.has(`${conn.sourceHandle}->${conn.targetHandle}`)) {
    return 'incompatible connection';
  }

  const targetEdges = edges.filter((e) => e.target === conn.target);
  const th = conn.targetHandle;

  if (
    th === HANDLE.promptIn &&
    targetEdges.some((e) => e.targetHandle === HANDLE.promptIn)
  ) {
    return 'prompt input already connected';
  }
  if (
    th === HANDLE.startIn &&
    targetEdges.some((e) => e.targetHandle === HANDLE.startIn)
  ) {
    return 'start frame input already connected';
  }
  if (
    th === HANDLE.refIn &&
    targetEdges.filter((e) => e.targetHandle === HANDLE.refIn).length >=
      MAX_REFERENCE_EDGES
  ) {
    return `max ${MAX_REFERENCE_EDGES} reference images`;
  }
  // Restriccion del SDK Veo: referenceImages no admite image/lastFrame.
  if (
    th === HANDLE.startIn &&
    targetEdges.some((e) => e.targetHandle === HANDLE.refIn)
  ) {
    return 'references and start frame are mutually exclusive';
  }
  if (
    th === HANDLE.refIn &&
    targetEdges.some((e) => e.targetHandle === HANDLE.startIn)
  ) {
    return 'references and start frame are mutually exclusive';
  }

  if (wouldCreateCycle(conn, edges)) return 'connection would create a cycle';
  return null;
}

export function wouldCreateCycle(
  conn: FlowEdgeLite,
  edges: FlowEdgeLite[]
): boolean {
  // Hay ciclo si desde conn.target se alcanza conn.source por edges existentes.
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    adjacency.set(e.source, [...(adjacency.get(e.source) ?? []), e.target]);
  }
  const stack = [conn.target];
  const seen = new Set<string>();
  while (stack.length) {
    const current = stack.pop()!;
    if (current === conn.source) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    stack.push(...(adjacency.get(current) ?? []));
  }
  return false;
}

export function topologicalOrder(
  nodes: FlowNodeLite[],
  edges: FlowEdgeLite[]
): string[] {
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  for (const e of edges) {
    indegree.set(e.target, (indegree.get(e.target) ?? 0) + 1);
  }
  const queue = nodes
    .filter((n) => (indegree.get(n.id) ?? 0) === 0)
    .map((n) => n.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const e of edges) {
      if (e.source !== id) continue;
      const d = (indegree.get(e.target) ?? 0) - 1;
      indegree.set(e.target, d);
      if (d === 0) queue.push(e.target);
    }
  }
  if (order.length !== nodes.length) throw new Error('graph has a cycle');
  return order;
}

export function resolveVideoMode(
  hasStart: boolean,
  referenceCount: number
): VideoNodeMode {
  if (referenceCount > 0) return 'ingredients';
  if (hasStart) return 'frames';
  return 'text';
}
