import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DatabaseService } from '../lib/services';
import { StorageService } from '../lib/services';

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
  reset: () => void;
  clearFiles?: () => void;
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

          // Use DatabaseService to get PDF state
          const { pdfState, error } = await DatabaseService.getPdfState(user.id, 'all');
          
          if (error) {
            console.error('Error getting PDF state:', error);
            return;
          }

          if (pdfState) {
            const loadPDFs = async () => {
              // Handle PDF state data from AWS
              if (pdfState.viewer === 1 && pdfState.public_url) {
                try {
                  const response = await fetch(pdfState.public_url);
                  const blob = await response.blob();
                  const file = new File([blob], pdfState.file_name, { type: 'application/pdf' });
                  set({ file1: file });
                } catch (error) {
                  console.error(`Error loading PDF ${pdfState.file_name}:`, error);
                }
              } else if (pdfState.viewer === 2 && pdfState.public_url) {
                try {
                  const response = await fetch(pdfState.public_url);
                  const blob = await response.blob();
                  const file = new File([blob], pdfState.file_name, { type: 'application/pdf' });
                  set({ file2: file });
                } catch (error) {
                  console.error(`Error loading PDF ${pdfState.file_name}:`, error);
                }
              }

              // Store the URL for future use
              if (pdfState.file_path && pdfState.public_url) {
                set(state => ({
                  pdfUrls: {
                    ...state.pdfUrls,
                    [pdfState.file_path]: pdfState.public_url
                  }
                }));
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
            const filePath = `pdfs/${user.id}/${timestamp}-${file.name}`;

            console.log('Attempting to upload file to S3:', filePath);

            // Upload to S3 using StorageService
            const uploadResult = await StorageService.uploadFile(file, filePath);

            if (uploadResult.error) {
              console.error('Upload error details:', uploadResult.error);
              throw uploadResult.error;
            }

            console.log('File uploaded successfully to S3');

            // Use DatabaseService to save PDF state
            const pdfStateData = {
              viewer: 1,
              file_path: filePath,
              public_url: uploadResult.url,
              file_name: file.name
            };

            const { error: dbError } = await DatabaseService.updatePdfState(user.id, filePath, pdfStateData);

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
            const filePath = `pdfs/${user.id}/${timestamp}-${file.name}`;

            // Upload to S3 using StorageService
            const uploadResult = await StorageService.uploadFile(file, filePath);

            if (uploadResult.error) {
              console.error('Upload error details:', uploadResult.error);
              throw uploadResult.error;
            }

            console.log('File uploaded successfully to S3');

            // Use DatabaseService to save PDF state
            const pdfStateData = {
              viewer: 2,
              file_path: filePath,
              public_url: uploadResult.url,
              file_name: file.name
            };

            const { error: dbError } = await DatabaseService.updatePdfState(user.id, filePath, pdfStateData);

            if (dbError) {
              console.error('Database error:', dbError);
              throw dbError;
            }
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
      },

      // Add reset method to clear all PDF state and persisted keys
      reset: () => {
        set({
          file1: null,
          file2: null,
          pageStates1: {},
          pageStates2: {},
          currentPage1: 1,
          currentPage2: 1,
          pdfUrls: {},
          isInitialized: false,
        });
        localStorage.removeItem('pdf1Name');
        localStorage.removeItem('pdf2Name');
        localStorage.removeItem('pageStates1');
        localStorage.removeItem('pageStates2');
        // Remove any other PDF-related keys if needed
      },

      clearFiles: () => {
        set({
          file1: null,
          file2: null,
          pdfUrls: {},
          isInitialized: false,
        });
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