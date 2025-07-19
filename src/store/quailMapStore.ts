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
    url: ''
  },
  {
    id: 'midlands-nw',
    name: 'Midlands NW',
    url: ''
  },
  {
    id: 'south',
    name: 'South',
    url: ''
  },
  {
    id: 'western',
    name: 'Western',
    url: ''
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