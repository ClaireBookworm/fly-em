import type { GardenCell, GardenEdge } from './games.ts';

export type GardenEditor = {
  cells: GardenCell[];
  edges: GardenEdge[];
  selected: number | null;
  pulseCell: number | null;
  connecting: number | null;
};
export type GardenAction =
  | { type: 'add'; kind: GardenCell['kind'] }
  | { type: 'delete'; id: number }
  | { type: 'select'; id: number }
  | { type: 'connect' }
  | { type: 'pulse'; id: number }
  | { type: 'clear' };

export const initialGarden: GardenEditor = {
  cells: [{ id: 0, kind: 'exc', x: 100, y: 105 }],
  edges: [],
  selected: 0,
  pulseCell: 0,
  connecting: null,
};

export function gardenHasFeedback(edges: GardenEdge[]): boolean {
  const visited = new Set<number>(),
    path = new Set<number>();
  const visit = (id: number): boolean => {
    if (path.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    path.add(id);
    if (edges.some((edge) => edge.from === id && visit(edge.to))) return true;
    path.delete(id);
    return false;
  };
  return edges.some((edge) => visit(edge.from));
}

export function gardenEditor(
  state: GardenEditor,
  action: GardenAction,
): GardenEditor {
  switch (action.type) {
    case 'add': {
      if (state.cells.length >= 12) return state;
      // Reuse an empty slot without renumbering any surviving cells.
      const id = Array.from({ length: 12 }, (_, i) => i).find(
        (i) => !state.cells.some((c) => c.id === i),
      )!;
      const cell: GardenCell = {
        id,
        kind: action.kind,
        x: 100 + (id % 3) * 190,
        y: 105 + Math.floor(id / 3) * 155,
      };
      return {
        ...state,
        cells: [...state.cells, cell],
        edges:
          state.selected === null
            ? state.edges
            : [...state.edges, { from: state.selected, to: id }],
        selected: id,
        pulseCell: state.pulseCell ?? id,
        connecting: null,
      };
    }
    case 'delete': {
      const cells = state.cells.filter((c) => c.id !== action.id);
      const selected =
        state.selected === action.id ? (cells[0]?.id ?? null) : state.selected;
      return {
        cells,
        edges: state.edges.filter(
          (e) => e.from !== action.id && e.to !== action.id,
        ),
        selected,
        pulseCell: state.pulseCell === action.id ? selected : state.pulseCell,
        connecting: null,
      };
    }
    case 'select': {
      if (!state.cells.some((c) => c.id === action.id)) return state;
      if (state.connecting === null || state.connecting === action.id)
        return { ...state, selected: action.id };
      const exists = state.edges.some(
        (e) => e.from === state.connecting && e.to === action.id,
      );
      return {
        ...state,
        selected: action.id,
        connecting: null,
        edges: exists
          ? state.edges.filter(
              (e) => !(e.from === state.connecting && e.to === action.id),
            )
          : [...state.edges, { from: state.connecting, to: action.id }],
      };
    }
    case 'connect':
      return {
        ...state,
        connecting: state.connecting === null ? state.selected : null,
      };
    case 'pulse':
      return state.cells.some((c) => c.id === action.id)
        ? { ...state, pulseCell: action.id }
        : state;
    case 'clear':
      return { ...initialGarden, cells: [...initialGarden.cells], edges: [] };
  }
}
