import { create } from 'zustand';
import { ImageMetadata, FormData } from '../types';
import { supabase } from '../lib/supabase';
import { nanoid } from 'nanoid';

interface BulkDefect {
  id?: string;
  photoNumber: string;
  description: string;
  selectedFile: string;
}

// Make sure initialFormData is truly empty
const initialFormData: FormData = {
  elr: '',
  structureNo: '',
  date: '',
};

// We need to separate the state interface from the actions
interface MetadataStateOnly {
  images: ImageMetadata[];
  selectedImages: Set<string>;
  bulkSelectedImages: Set<string>;
  formData: FormData;
  defectSortDirection: 'asc' | 'desc' | null;
  sketchSortDirection: 'asc' | 'desc' | null;
  bulkDefects: BulkDefect[];
  viewMode: 'images' | 'bulk';
  savedPdfs: {
    [userId: string]: {
      name: string;
      url: string;
      uploadDate: string;
    }[];
  };
}

// Combine state and actions
interface MetadataState extends MetadataStateOnly {
  setFormData: (data: Partial<FormData>) => void;
  addImages: (files: File[], isSketch?: boolean) => Promise<void>;
  updateImageMetadata: (id: string, data: Partial<Omit<ImageMetadata, 'id' | 'file' | 'preview'>>) => void;
  removeImage: (id: string) => Promise<void>;
  toggleImageSelection: (id: string) => void;
  toggleBulkImageSelection: (id: string) => void;
  clearSelectedImages: () => void;
  clearBulkSelectedImages: () => void;
  setDefectSortDirection: (direction: 'asc' | 'desc' | null) => void;
  setSketchSortDirection: (direction: 'asc' | 'desc' | null) => void;
  setBulkDefects: (defects: BulkDefect[] | ((prev: BulkDefect[]) => BulkDefect[])) => void;
  reset: () => void;
  getSelectedCounts: () => { sketches: number; defects: number };
  loadUserData: () => Promise<void>;
  saveUserData: () => Promise<void>;
  setViewMode: (mode: 'images' | 'bulk') => void;
  saveBulkData: () => Promise<void>;
  loadBulkData: () => Promise<void>;
  generateBulkZip: () => Promise<void>;
  clearBulkData: () => void;
  savePdf: (userId: string, file: File) => Promise<void>;
  removePdf: (userId: string, pdfName: string) => Promise<void>;
  loadSavedPdfs: (userId: string) => Promise<void>;
}

const initialState: MetadataStateOnly = {
  images: [],
  selectedImages: new Set(),
  bulkSelectedImages: new Set(),
  formData: initialFormData,
  defectSortDirection: null,
  sketchSortDirection: null,
  bulkDefects: [],
  viewMode: 'images',
  savedPdfs: {},
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...initialState,

  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
    get().saveUserData().catch(console.error);
  },

  addImages: async (files, isSketch = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newImages = await Promise.all(files.map(async (file) => {
        const timestamp = new Date().getTime();
        const filePath = `${user.id}/${timestamp}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from('user-project-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('user-project-files')
          .getPublicUrl(filePath);

        if (!publicUrl) throw new Error('Failed to get public URL');

        return {
          id: crypto.randomUUID(),
          file,
          photoNumber: '',
          description: '',
          preview: URL.createObjectURL(file),
          isSketch,
          publicUrl,
          userId: user.id
        };
      }));

      set((state) => {
        // Combine and sort images by photoNumber (asc), fallback to filename
        const combined = [...state.images, ...newImages];
        combined.sort((a, b) => {
          const aNum = parseInt(a.photoNumber);
          const bNum = parseInt(b.photoNumber);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.file.name.localeCompare(b.file.name);
        });
        return { images: combined };
      });

      await get().saveUserData();
    } catch (error) {
      console.error('Error adding images:', error);
      throw error;
    }
  },

  updateImageMetadata: (id, data) => {
    set((state) => {
      const updatedImages = state.images.map((img) =>
        img.id === id ? { ...img, ...data } : img
      );
      get().saveUserData().catch(console.error);
      return { images: updatedImages };
    });
  },

  removeImage: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const imageToRemove = get().images.find(img => img.id === id);
      if (imageToRemove?.publicUrl) {
        const url = new URL(imageToRemove.publicUrl);
        const filePath = decodeURIComponent(url.pathname.split('/').slice(-2).join('/'));
        
        const { error: deleteError } = await supabase.storage
          .from('user-project-files')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      set((state) => ({
        images: state.images.filter((img) => img.id !== id),
        selectedImages: new Set([...state.selectedImages].filter(imgId => imgId !== id)),
        bulkSelectedImages: new Set([...state.bulkSelectedImages].filter(imgId => imgId !== id)),
      }));

      await get().saveUserData();
    } catch (error) {
      console.error('Error removing image:', error);
      throw error;
    }
  },

  toggleImageSelection: (id) => {
    set((state) => {
      let newSelected = new Set(state.selectedImages);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        // Get the image being selected
        const selectedImage = state.images.find(img => img.id === id);
        if (!selectedImage) return { selectedImages: newSelected };

        // Convert Set to Array for manipulation
        const selectedArray = Array.from(newSelected);
        
        // Determine sort direction for defects (since this is for defect images)
        const sortDirection = state.defectSortDirection;
        
        if (sortDirection) {
          // Find the correct position based on sort direction
          const selectedImageNumber = parseInt(selectedImage.photoNumber) || 0;
          
          let insertIndex = selectedArray.length; // Default to end
          
          if (sortDirection === 'asc') {
            // Low to High: find position where image should go
            for (let i = 0; i < selectedArray.length; i++) {
              const existingImage = state.images.find(img => img.id === selectedArray[i]);
              if (existingImage) {
                const existingNumber = parseInt(existingImage.photoNumber) || 0;
                if (selectedImageNumber < existingNumber) {
                  insertIndex = i;
                  break;
                }
              }
            }
          } else if (sortDirection === 'desc') {
            // High to Low: find position where image should go
            for (let i = 0; i < selectedArray.length; i++) {
              const existingImage = state.images.find(img => img.id === selectedArray[i]);
              if (existingImage) {
                const existingNumber = parseInt(existingImage.photoNumber) || 0;
                if (selectedImageNumber > existingNumber) {
                  insertIndex = i;
                  break;
                }
              }
            }
          }
          
          // Insert at the correct position
          selectedArray.splice(insertIndex, 0, id);
          newSelected = new Set(selectedArray);
        } else {
          // No sorting: add to end
          newSelected.add(id);
        }
      }
      return { selectedImages: newSelected };
    });
  },

  toggleBulkImageSelection: (id) => {
    set((state) => {
      const newSelection = new Set(state.bulkSelectedImages);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { bulkSelectedImages: newSelection };
    });
  },

  clearSelectedImages: () => {
    set((state) => {
      const updatedImages = state.images.map((img) =>
        state.selectedImages.has(img.id) && !img.isSketch
          ? { ...img, photoNumber: '', description: '' }
          : img
      );
      
      get().saveUserData().catch(console.error);
      return {
        selectedImages: new Set(),
        images: updatedImages
      };
    });
  },

  clearBulkSelectedImages: () => {
    set({ bulkSelectedImages: new Set() });
  },

  setDefectSortDirection: (direction) =>
    set(() => ({
      defectSortDirection: direction
    })),

  setSketchSortDirection: (direction) =>
    set(() => ({
      sketchSortDirection: direction
    })),

  setBulkDefects: (defects: BulkDefect[] | ((prev: BulkDefect[]) => BulkDefect[])) => {
    set((state) => {
      const newDefects = typeof defects === 'function' ? defects(state.bulkDefects) : defects;
      // Ensure all defects have IDs
      const defectsWithIds = newDefects.map(defect => ({
        ...defect,
        id: defect.id || nanoid()
      }));
      return { bulkDefects: defectsWithIds };
    });
    // Auto-save whenever defects change
    get().saveBulkData().catch(console.error);
  },

  reset: () => {
    set({
      images: [],
      selectedImages: new Set(),
      bulkSelectedImages: new Set(),
      formData: { elr: '', structureNo: '', date: '' }, // force empty
      defectSortDirection: null,
      sketchSortDirection: null,
      bulkDefects: [],
      viewMode: 'images'
    });
  },

  getSelectedCounts: () => {
    const state = get();
    const selectedImagesList = state.images.filter(img => state.selectedImages.has(img.id));
    return {
      sketches: selectedImagesList.filter(img => img.isSketch).length,
      defects: selectedImagesList.filter(img => !img.isSketch).length
    };
  },

  loadUserData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return;
        throw error;
      }

      if (data?.images) {
        // Pre-load all images before updating state
        const imagePromises = data.images.map(async (imgData: any) => {
          try {
            if (!imgData.publicUrl) return null;

            // Create new Image to preload
            await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = resolve;
              img.onerror = reject;
              img.src = imgData.publicUrl;
            });

            // Create File object
            const response = await fetch(imgData.publicUrl);
            const blob = await response.blob();
            const file = new File([blob], imgData.fileName || 'image.jpg', {
              type: imgData.fileType || blob.type
            });

            return {
              id: imgData.id,
              file,
              photoNumber: imgData.photoNumber || '',
              description: imgData.description || '',
              preview: imgData.publicUrl, // Use publicUrl directly instead of creating new blob URL
              isSketch: imgData.isSketch || false,
              publicUrl: imgData.publicUrl,
              userId: imgData.userId
            };
          } catch (error) {
            console.error('Error loading image:', error);
            return null;
          }
        });

        const loadedImages = (await Promise.all(imagePromises)).filter((img): img is ImageMetadata => img !== null);

        set({
          images: loadedImages,
          selectedImages: new Set(data.selected_images || []),
          formData: data.form_data || initialFormData
        });
      }

      // Load saved PDFs
      const { data: pdfData, error: pdfError } = await supabase
        .from('user_pdfs')
        .select('*')
        .eq('user_id', user.id);

      if (pdfError) throw pdfError;

      if (pdfData) {
        set((state) => ({
          savedPdfs: {
            ...state.savedPdfs,
            [user.id]: pdfData.map(pdf => ({
              name: pdf.name,
              url: pdf.url,
              uploadDate: pdf.upload_date
            }))
          }
        }));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  },

  saveUserData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const state = get();
      
      // Validate images before saving
      const imagesWithMissingDescriptions = state.images
        .filter(img => !img.isSketch && state.selectedImages.has(img.id) && !img.description?.trim());

      if (imagesWithMissingDescriptions.length > 0) {
        const firstMissing = imagesWithMissingDescriptions[0];
        throw new Error(`Description is required for defect: ${firstMissing.file.name}`);
      }

      const imagesData = state.images.map(img => ({
        id: img.id,
        photoNumber: img.photoNumber,
        description: img.description,
        isSketch: img.isSketch,
        publicUrl: img.publicUrl,
        userId: img.userId,
        fileName: img.file.name,
        fileType: img.file.type,
        fileSize: img.file.size
      }));

      const { error } = await supabase
        .from('projects')
        .upsert({
          id: user.id,
          form_data: state.formData,
          images: imagesData,
          selected_images: Array.from(state.selectedImages),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  saveBulkData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const state = get();
      
      // Only validate defects that have a file selected
      const defectsWithMissingDescriptions = state.bulkDefects
        .filter(defect => {
          // Check if the file exists in the images array and has no description
          const fileExists = state.images.some(img => img.file.name === defect.selectedFile);
          const hasNoDescription = !defect.description?.trim();
          return fileExists && hasNoDescription;
        });

      if (defectsWithMissingDescriptions.length > 0) {
        const firstMissing = defectsWithMissingDescriptions[0];
        throw new Error(`Description is required for defect number: ${firstMissing.photoNumber}`);
      }

      const { error } = await supabase
        .from('bulk_defects')
        .upsert({
          id: user.id,
          data: {
            defects: state.bulkDefects,
            selectedImages: Array.from(state.bulkSelectedImages),
            updatedAt: new Date().toISOString()
          }
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving bulk data:', error);
      throw error;
    }
  },

  loadBulkData: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bulk_defects')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return; // No data found
        throw error;
      }

      if (data?.data) {
        // Ensure all defects have IDs when loading
        const defectsWithIds = (data.data.defects || []).map((defect: BulkDefect) => ({
          ...defect,
          id: defect.id || nanoid()
        }));

        set({
          bulkDefects: defectsWithIds,
          bulkSelectedImages: new Set(data.data.selectedImages || [])
        });
      }
    } catch (error) {
      console.error('Error loading bulk data:', error);
      throw error;
    }
  },

  generateBulkZip: async () => {
    try {
      const state = get();
      // 1. Build a list of ImageMetadata for all images referenced by bulkDefects with a selectedFile
      const defectsWithImages = state.bulkDefects.filter(defect => defect.selectedFile);
      if (defectsWithImages.length === 0) {
        throw new Error('No defects with images selected');
      }
      // 2. Map to ImageMetadata, setting photoNumber/description from defect
      const imagesToDownload = defectsWithImages.map(defect => {
        const img = state.images.find(img => img.file.name === defect.selectedFile);
        if (!img) throw new Error(`Image not found for defect ${defect.photoNumber}`);
        return {
          ...img,
          photoNumber: defect.photoNumber,
          description: defect.description
        };
      });
      // 3. Use the same validation and packaging as the images tab
      const { formData } = state;
      const { createDownloadPackage } = await import('../utils/fileUtils');
      const { validateImages } = await import('../utils/fileValidation');
      const imagesError = validateImages(imagesToDownload);
      if (imagesError) {
        throw new Error(imagesError);
      }
      const zipBlob = await createDownloadPackage(imagesToDownload, formData);
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${formData.elr.trim().toUpperCase()}_${formData.structureNo.trim()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating zip:', error);
      throw error;
    }
  },

  clearBulkData: () => {
    set({
      bulkDefects: [],
      bulkSelectedImages: new Set()
    });
  },

  savePdf: async (userId: string, file: File) => {
    try {
      const timestamp = new Date().getTime();
      const filePath = `${userId}/pdfs/${timestamp}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('user-pdfs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-pdfs')
        .getPublicUrl(filePath);

      if (!publicUrl) throw new Error('Failed to get public URL');

      // Save PDF metadata to Supabase database
      const { error: dbError } = await supabase
        .from('user_pdfs')
        .insert({
          user_id: userId,
          name: file.name,
          url: publicUrl,
          upload_date: new Date().toISOString()
        });

      if (dbError) throw dbError;

      // Update local state
      set((state) => ({
        savedPdfs: {
          ...state.savedPdfs,
          [userId]: [
            ...(state.savedPdfs[userId] || []),
            {
              name: file.name,
              url: publicUrl,
              uploadDate: new Date().toISOString(),
            },
          ],
        },
      }));
    } catch (error) {
      console.error('Error saving PDF:', error);
      throw error;
    }
  },

  removePdf: async (userId: string, pdfName: string) => {
    try {
      // Get the PDF record from the database
      const { data: pdfRecord, error: fetchError } = await supabase
        .from('user_pdfs')
        .select('url')
        .eq('user_id', userId)
        .eq('name', pdfName)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const url = new URL(pdfRecord.url);
      const filePath = decodeURIComponent(url.pathname.split('/').slice(-2).join('/'));
      
      const { error: storageError } = await supabase.storage
        .from('user-pdfs')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_pdfs')
        .delete()
        .eq('user_id', userId)
        .eq('name', pdfName);

      if (dbError) throw dbError;

      // Update local state
      set((state) => ({
        savedPdfs: {
          ...state.savedPdfs,
          [userId]: state.savedPdfs[userId]?.filter((pdf) => pdf.name !== pdfName) || [],
        },
      }));
    } catch (error) {
      console.error('Error removing PDF:', error);
      throw error;
    }
  },

  loadSavedPdfs: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_pdfs')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      set((state) => ({
        savedPdfs: {
          ...state.savedPdfs,
          [userId]: data.map(pdf => ({
            name: pdf.name,
            url: pdf.url,
            uploadDate: pdf.upload_date
          }))
        }
      }));
    } catch (error) {
      console.error('Error loading PDFs:', error);
      throw error;
    }
  },
}));