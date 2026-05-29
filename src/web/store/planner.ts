import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Item, ItemCountConstraint, Lane } from '../../shared/schemas';
import { uid } from '../lib/format';

export type CountMode = 'range' | 'fixed' | 'any';

export type PlannerState = {
  budget: number;
  itemCountMode: CountMode;
  itemCountMin: number | null;
  itemCountMax: number | null;
  itemCountFixed: number | null;
  participantCount: number;
  items: Item[];
};

export type PlannerActions = {
  setStart: (input: {
    budget: number;
    participantCount: number;
    itemCountMode: CountMode;
    itemCountMin: number | null;
    itemCountMax: number | null;
    itemCountFixed: number | null;
  }) => void;
  addItem: (
    partial: Partial<Item> & { name?: string },
  ) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  moveItem: (id: string, lane: Lane, orderInLane: number) => void;
  reorderLane: (lane: Lane, orderedIds: string[]) => void;
  reset: () => void;
};

const initial: PlannerState = {
  budget: 200000,
  itemCountMode: 'range',
  itemCountMin: 10,
  itemCountMax: 20,
  itemCountFixed: null,
  participantCount: 30,
  items: [],
};

export const usePlannerStore = create<PlannerState & PlannerActions>()(
  persist(
    (set) => ({
      ...initial,

      setStart: (input) =>
        set({
          budget: input.budget,
          participantCount: input.participantCount,
          itemCountMode: input.itemCountMode,
          itemCountMin: input.itemCountMin,
          itemCountMax: input.itemCountMax,
          itemCountFixed: input.itemCountFixed,
        }),

      addItem: (partial) =>
        set((s) => {
          const lane: Lane = partial.lane ?? 'other';
          const sameLane = s.items.filter((i) => i.lane === lane);
          const maxOrder = sameLane.reduce((m, i) => Math.max(m, i.order ?? 0), 0);
          const newItem: Item = {
            id: partial.id ?? uid(),
            name: partial.name ?? '',
            url: partial.url ?? '',
            unitPrice: partial.unitPrice ?? 0,
            quantity: partial.quantity ?? 1,
            rating: partial.rating ?? null,
            lane,
            order: maxOrder + 1,
          };
          return { items: [...s.items, newItem] };
        }),

      updateItem: (id, patch) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
        })),

      deleteItem: (id) =>
        set((s) => ({
          items: s.items.filter((i) => i.id !== id),
        })),

      moveItem: (id, lane, orderInLane) =>
        set((s) => ({
          items: s.items.map((i) => (i.id === id ? { ...i, lane, order: orderInLane } : i)),
        })),

      reorderLane: (lane, orderedIds) =>
        set((s) => ({
          items: s.items.map((i) => {
            if (i.lane !== lane) return i;
            const idx = orderedIds.indexOf(i.id);
            return idx >= 0 ? { ...i, order: idx + 1 } : i;
          }),
        })),

      reset: () => set(initial),
    }),
    {
      name: 'gift-planner-state',
      version: 1,
    },
  ),
);

// ============================================================
// セレクタ系
// ============================================================
export function selectCountConstraint(s: PlannerState): ItemCountConstraint {
  if (s.itemCountMode === 'fixed' && s.itemCountFixed != null) {
    return { mode: 'fixed', value: s.itemCountFixed };
  }
  if (s.itemCountMode === 'any') return { mode: 'any' };
  return { mode: 'range', min: s.itemCountMin, max: s.itemCountMax };
}

export function countConstraintLabel(c: ItemCountConstraint): string {
  if (c.mode === 'fixed') return `ちょうど ${c.value} 個`;
  if (c.mode === 'any') return '指定なし';
  const hasMin = c.min != null && c.min > 0;
  const hasMax = c.max != null;
  if (hasMin && hasMax) return `${c.min}〜${c.max} 個`;
  if (hasMin) return `${c.min} 個以上`;
  if (hasMax) return `${c.max} 個以下`;
  return '指定なし';
}

export function selectLane(s: PlannerState, lane: Lane): Item[] {
  return s.items
    .filter((i) => i.lane === lane)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function selectTotals(s: PlannerState) {
  const total = s.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const count = s.items.reduce((sum, i) => sum + i.quantity, 0);
  return { total, count };
}
