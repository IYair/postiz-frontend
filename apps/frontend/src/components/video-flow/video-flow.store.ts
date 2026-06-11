import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import {
  validateConnection,
  type NodeStatus,
  type FlowNodeType,
} from './flow-logic';

const STORAGE_KEY = 'postiz-video-flow-v1';

const DEFAULT_DATA: Record<FlowNodeType, Record<string, any>> = {
  text: { prompt: '' },
  image: {
    source: 'generate',
    prompt: '',
    aspectRatio: 'landscape',
    enhancePrompt: false,
  },
  video: { prompt: '', aspectRatio: '16:9', durationSeconds: 8, seed: '' },
};

function load(): { nodes: Node[]; edges: Edge[] } {
  if (typeof window === 'undefined') return { nodes: [], edges: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { nodes: [], edges: [] };
    const parsed = JSON.parse(raw);
    return { nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] };
  } catch {
    return { nodes: [], edges: [] };
  }
}

function persist(nodes: Node[], edges: Edge[]) {
  if (typeof window === 'undefined') return;
  // No persistimos uploads base64: pueden exceder la cuota de localStorage.
  const slim = nodes.map((n) => ({
    ...n,
    data: { ...n.data, upload: undefined },
  }));
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ nodes: slim, edges })
    );
  } catch {
    // cuota llena: el flow sigue en memoria
  }
}

export interface VideoFlowState {
  nodes: Node[];
  edges: Edge[];
  statuses: Record<string, NodeStatus>;
  errors: Record<string, string>;
  running: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  // Devuelve mensaje de error si la conexion es invalida; null si conecto.
  onConnect: (conn: Connection) => string | null;
  addNode: (type: FlowNodeType) => void;
  updateNodeData: (id: string, data: Record<string, any>) => void;
  setStatus: (id: string, status: NodeStatus, error?: string) => void;
  setRunning: (running: boolean) => void;
  resetRun: () => void;
  clearAll: () => void;
}

let nodeCounter = 1;

export const useVideoFlowStore = create<VideoFlowState>((set, get) => ({
  ...load(),
  statuses: {},
  errors: {},
  running: false,

  onNodesChange: (changes) => {
    const nodes = applyNodeChanges(changes, get().nodes);
    set({ nodes });
    persist(nodes, get().edges);
  },

  onEdgesChange: (changes) => {
    const edges = applyEdgeChanges(changes, get().edges);
    set({ edges });
    persist(get().nodes, edges);
  },

  onConnect: (conn) => {
    const { nodes, edges } = get();
    const lite = nodes.map((n) => ({
      id: n.id,
      type: n.type as FlowNodeType,
    }));
    const error = validateConnection(
      {
        source: conn.source!,
        target: conn.target!,
        sourceHandle: conn.sourceHandle,
        targetHandle: conn.targetHandle,
      },
      lite,
      edges
    );
    if (error) return error;
    const next = addEdge(conn, edges);
    set({ edges: next });
    persist(nodes, next);
    return null;
  },

  addNode: (type) => {
    const count = get().nodes.length;
    const node: Node = {
      id: `${type}-${Date.now().toString(36)}-${nodeCounter++}`,
      type,
      position: {
        x: 80 + (count % 4) * 320,
        y: 80 + Math.floor(count / 4) * 260,
      },
      data: { ...DEFAULT_DATA[type] },
    };
    const nodes = [...get().nodes, node];
    set({ nodes });
    persist(nodes, get().edges);
  },

  updateNodeData: (id, data) => {
    const nodes = get().nodes.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, ...data } } : n
    );
    set({ nodes });
    persist(nodes, get().edges);
  },

  setStatus: (id, status, error) =>
    set((s) => ({
      statuses: { ...s.statuses, [id]: status },
      errors: error
        ? { ...s.errors, [id]: error }
        : (({ [id]: _drop, ...rest }) => rest)(s.errors),
    })),

  setRunning: (running) => set({ running }),

  resetRun: () => set({ statuses: {}, errors: {} }),

  clearAll: () => {
    set({ nodes: [], edges: [], statuses: {}, errors: {} });
    persist([], []);
  },
}));
