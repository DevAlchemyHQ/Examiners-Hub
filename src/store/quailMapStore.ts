import { create } from 'zustand';

interface QuailMap {
  id: string;
  name: string;
  url: string;
}

interface QuailMapState {
  maps: QuailMap[];
  isLoading: boolean;
  error: string | null;
  fetchMaps: () => Promise<void>;
}

const PREDEFINED_MAPS = [
  {
    id: 'eastern',
    name: 'Eastern',
    url: 'https://hmrinsnimrwijlqtqahb.supabase.co/storage/v1/object/public/pdfs/eastern.pdf?t=2025-01-16T23%3A48%3A47.807Z'
  },
  {
    id: 'midlands-nw',
    name: 'Midlands NW',
    url: 'https://hmrinsnimrwijlqtqahb.supabase.co/storage/v1/object/public/pdfs/midlands-nw.pdf?t=2025-01-16T23%3A49%3A52.847Z'
  },
  {
    id: 'south',
    name: 'South',
    url: 'https://hmrinsnimrwijlqtqahb.supabase.co/storage/v1/object/public/pdfs/south.pdf?t=2025-01-16T23%3A50%3A05.063Z'
  },
  {
    id: 'western',
    name: 'Western',
    url: 'https://hmrinsnimrwijlqtqahb.supabase.co/storage/v1/object/public/pdfs/western.pdf?t=2025-01-16T23%3A50%3A21.391Z'
  }
];

export const useQuailMapStore = create<QuailMapState>((set) => ({
  maps: [],
  isLoading: false,
  error: null,

  fetchMaps: async () => {
    try {
      set({ isLoading: true, error: null });
      set({ maps: PREDEFINED_MAPS });
    } catch (error) {
      set({ error: 'Failed to fetch maps' });
      console.error('Error fetching maps:', error);
    } finally {
      set({ isLoading: false });
    }
  }
}));