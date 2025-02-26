import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface PDFState {
  file1: File | null;
  file2: File | null;
  pageStates1: Record<number, { rotation: number; currentPage: number }>;
  pageStates2: Record<number, { rotation: number; currentPage: number }>;
  currentPage1: number;
  currentPage2: number;
  pdfUrls: Record<string, string>; // Store PDF URLs
  isInitialized: boolean;
  setFile1: (file: File | null) => Promise<void>;
  setFile2: (file: File | null) => Promise<void>;
  setPageState1: (pageNumber: number, state: { rotation: number; currentPage: number }) => void;
  setPageState2: (pageNumber: number, state: { rotation: number; currentPage: number }) => void;
  setCurrentPage: (viewer: 1 | 2, page: number) => void;
  initializePDFs: () => Promise<void>;
}

export const usePDFStore = create<PDFState>()(
  persist(
    (set, get) => ({
      file1: null,
      file2: null,
      pageStates1: {},
      pageStates2: {},
      currentPage1: 1,
      currentPage2: 1,
      pdfUrls: {},
      isInitialized: false,

      setCurrentPage: (viewer: 1 | 2, page: number) => {
        set(state => ({
          ...(viewer === 1 ? { currentPage1: page } : { currentPage2: page })
        }));
      },

      initializePDFs: async () => {
        if (get().isInitialized) return;

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: pdfStates } = await supabase
            .from('user_pdf_state')
            .select('*')
            .eq('user_id', user.id);

          if (pdfStates) {
            const loadPDFs = async () => {
              for (const state of pdfStates) {
                try {
                  const response = await fetch(state.public_url);
                  const blob = await response.blob();
                  const file = new File([blob], state.file_name, { type: 'application/pdf' });
                  
                  if (state.viewer === 1) {
                    set({ file1: file });
                  } else {
                    set({ file2: file });
                  }
                  
                  // Store the URL for future use
                  set(state => ({
                    pdfUrls: {
                      ...state.pdfUrls,
                      [state.file_path]: state.public_url
                    }
                  }));
                } catch (error) {
                  console.error(`Error loading PDF ${state.file_name}:`, error);
                }
              }
            };

            // Load PDFs immediately
            await loadPDFs();
            set({ isInitialized: true });
          }
        } catch (error) {
          console.error('Error initializing PDFs:', error);
        }
      },

      setFile1: async (file) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          if (file) {
            const timestamp = new Date().getTime();
            const filePath = `${user.id}/pdfs/${timestamp}-${file.name}`;

            console.log('Attempting to upload file:', filePath);

            const { error: uploadError } = await supabase.storage
              .from('user-pdfs')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload error details:', uploadError);
              throw uploadError;
            }

            console.log('File uploaded successfully');

            const { data: { publicUrl } } = supabase.storage
              .from('user-pdfs')
              .getPublicUrl(filePath);

            if (!publicUrl) throw new Error('Failed to get public URL');

            console.log('Got public URL:', publicUrl);

            const { error: dbError } = await supabase.from('user_pdf_state').upsert({
              user_id: user.id,
              viewer: 1,
              file_path: filePath,
              public_url: publicUrl,
              file_name: file.name
            });

            if (dbError) {
              console.error('Database error:', dbError);
              throw dbError;
            }

            console.log('PDF state saved to database');

            set({ file1: file });
            localStorage.setItem('pdf1Name', file.name);
          }
        } catch (error) {
          console.error('Error in setFile1:', error);
          throw error;
        }
      },

      setFile2: async (file) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('Not authenticated');

          if (file) {
            const timestamp = new Date().getTime();
            const filePath = `${user.id}/pdfs/${timestamp}-${file.name}`;

            const { error: uploadError } = await supabase.storage
              .from('user-pdfs')
              .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
              .from('user-pdfs')
              .getPublicUrl(filePath);

            await supabase.from('user_pdf_state').upsert({
              user_id: user.id,
              viewer: 2,
              file_path: filePath,
              public_url: publicUrl,
              file_name: file.name
            });
          }

          set({ file2: file });
          localStorage.setItem('pdf2Name', file?.name || '');
        } catch (error) {
          console.error('Error saving PDF:', error);
          throw error;
        }
      },

      setPageState1: (pageNumber, state) => {
        set(s => ({
          pageStates1: { ...s.pageStates1, [pageNumber]: state }
        }));
        localStorage.setItem('pageStates1', JSON.stringify(get().pageStates1));
      },

      setPageState2: (pageNumber, state) => {
        set(s => ({
          pageStates2: { ...s.pageStates2, [pageNumber]: state }
        }));
        localStorage.setItem('pageStates2', JSON.stringify(get().pageStates2));
      }
    }),
    {
      name: 'pdf-storage',
      partialize: (state) => ({
        currentPage1: state.currentPage1,
        currentPage2: state.currentPage2,
        pageStates1: state.pageStates1,
        pageStates2: state.pageStates2,
        pdfUrls: state.pdfUrls
      })
    }
  )
);