import { create } from 'zustand';

type Layout = 'grid' | 'list';

interface LayoutState {
  layout: Layout;
  toggleLayout: () => void;
}

export const useImageLayoutStore = create<LayoutState>((set) => ({
  layout: 'grid',
  toggleLayout: () => set((state) => ({ 
    layout: state.layout === 'grid' ? 'list' : 'grid' 
  })),
}));