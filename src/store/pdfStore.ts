import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface PDFState {
  file1: File | null;
  file2: File | null;
  setFile1: (file: File | null) => Promise<void>;
  setFile2: (file: File | null) => Promise<void>;
  clearFiles: () => void;
  loadPDFs: () => Promise<void>;
  savePDFs: () => Promise<void>;
}

export const usePDFStore = create<PDFState>()(
  persist(
    (set, get) => ({
      file1: null,
      file2: null,
      setFile1: async (file) => {
        try {
          if (file) {
            await get().savePDFs();
          }
          set({ file1: file });
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
          set({ file2: file });
        } catch (error) {
          console.error('Error setting file2:', error);
          throw error;
        }
      },
      clearFiles: () => set({ file1: null, file2: null }),

      loadPDFs: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // List PDF files in user's folder
          const { data: files } = await supabase.storage
            .from('user-project-files')
            .list(user.id, {
              search: '.pdf'
            });

          if (!files || files.length === 0) return;

          // Sort files by name to maintain order (pdf1, pdf2)
          const sortedFiles = files.sort((a, b) => a.name.localeCompare(b.name));

          // Load PDF files
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

          // Update store with loaded files
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

          // Delete existing PDF files
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

          // Upload new PDF files if they exist
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
        // We don't persist the actual files since they can't be serialized
        file1: null,
        file2: null,
      }),
    }
  )
);