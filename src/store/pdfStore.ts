import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface PageState {
  currentPage: number;
  rotation: number;
}

interface PDFState {
  file1: File | null;
  file2: File | null;
  pageStates1: { [pageNumber: number]: PageState };
  pageStates2: { [pageNumber: number]: PageState };
  setFile1: (file: File | null) => Promise<void>;
  setFile2: (file: File | null) => Promise<void>;
  setPageState1: (pageNumber: number, state: Partial<PageState>) => void;
  setPageState2: (pageNumber: number, state: Partial<PageState>) => void;
  clearFiles: () => void;
  loadPDFs: () => Promise<void>;
  savePDFs: () => Promise<void>;
}

export const usePDFStore = create<PDFState>()(
  persist(
    (set, get) => ({
      file1: null,
      file2: null,
      pageStates1: {},
      pageStates2: {},
      setFile1: async (file) => {
        try {
          if (file) {
            await get().savePDFs();
          }
          set({ file1: file, pageStates1: {} });
        } catch (error) {
          console.error('Error setting file1:', error);
          throw error;
        }
      },
      setFile2: async (file) => {
        try {
          if (file) {
            await get().savePDFs();
          }
          set({ file2: file, pageStates2: {} });
        } catch (error) {
          console.error('Error setting file2:', error);
          throw error;
        }
      },
      setPageState1: (pageNumber, state) => {
        set((currentState) => ({
          pageStates1: {
            ...currentState.pageStates1,
            [pageNumber]: {
              ...currentState.pageStates1[pageNumber],
              ...state,
            },
          },
        }));
      },
      setPageState2: (pageNumber, state) => {
        set((currentState) => ({
          pageStates2: {
            ...currentState.pageStates2,
            [pageNumber]: {
              ...currentState.pageStates2[pageNumber],
              ...state,
            },
          },
        }));
      },
      clearFiles: () => set({ 
        file1: null, 
        file2: null,
        pageStates1: {},
        pageStates2: {}
      }),
      loadPDFs: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: files } = await supabase.storage
            .from('user-project-files')
            .list(user.id, {
              search: '.pdf'
            });

          if (!files || files.length === 0) return;

          const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));

          const loadedFiles = await Promise.all(
            sortedFiles.slice(0, 2).map(async (fileInfo) => {
              const { data } = await supabase.storage
                .from('user-project-files')
                .download(`${user.id}/${fileInfo.name}`);

              if (!data) return null;

              return new File([data], fileInfo.name, {
                type: 'application/pdf'
              });
            })
          );

          set({
            file1: loadedFiles[0] || null,
            file2: loadedFiles[1] || null
          });
        } catch (error) {
          console.error('Error loading PDFs:', error);
          throw error;
        }
      },
      savePDFs: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { file1, file2 } = get();

          const { data: existingFiles } = await supabase.storage
            .from('user-project-files')
            .list(user.id, {
              search: '.pdf'
            });

          if (existingFiles && existingFiles.length > 0) {
            await supabase.storage
              .from('user-project-files')
              .remove(existingFiles.map(f => `${user.id}/${f.name}`));
          }

          const timestamp = new Date().getTime();
          
          if (file1) {
            await supabase.storage
              .from('user-project-files')
              .upload(`${user.id}/pdf1_${timestamp}.pdf`, file1, {
                cacheControl: '3600',
                upsert: true
              });
          }

          if (file2) {
            await supabase.storage
              .from('user-project-files')
              .upload(`${user.id}/pdf2_${timestamp}.pdf`, file2, {
                cacheControl: '3600',
                upsert: true
              });
          }
        } catch (error) {
          console.error('Error saving PDFs:', error);
          throw error;
        }
      }
    }),
    {
      name: 'pdf-storage',
      partialize: (state) => ({
        pageStates1: state.pageStates1,
        pageStates2: state.pageStates2,
      }),
    }
  )
);