import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Layout = 'grid' | 'list';

export const MIN_GRID_WIDTH = 3;
export const MAX_GRID_WIDTH = 8;

interface LayoutState {
  layout: Layout;
  toggleLayout: () => void;
  gridWidth: number;
  setGridWidth: (width: number) => void;
}

export const useImageLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      layout: 'grid',
      toggleLayout: () => set((state) => ({
        layout: state.layout === 'grid' ? 'list' : 'grid',
      })),
      gridWidth: MIN_GRID_WIDTH,
      setGridWidth: (width) =>
        set(() => ({
          gridWidth: Math.min(Math.max(width, MIN_GRID_WIDTH), MAX_GRID_WIDTH),
        })),
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({ gridWidth: state.gridWidth }),
    }
  )
);