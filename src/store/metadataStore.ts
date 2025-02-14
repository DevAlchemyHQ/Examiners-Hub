import { create } from 'zustand';
import { ImageMetadata, FormData } from '../types';
import { supabase } from '../lib/supabase';

interface BulkDefect {
  photoNumber: string;
  description: string;
  selectedFile?: string;
}

const initialFormData: FormData = {
  elr: '',
  structureNo: '',
  date: '',
};

interface MetadataState {
  images: ImageMetadata[];
  selectedImages: Set<string>;
  formData: FormData;
  defectSortDirection: 'asc' | 'desc' | null;
  sketchSortDirection: 'asc' | 'desc' | null;
  bulkDefects: BulkDefect[];
  setFormData: (data: Partial<FormData>) => void;
  addImages: (files: File[], isSketch?: boolean) => Promise<void>;
  setImages: (images: ImageMetadata[]) => void;
  updateImageMetadata: (id: string, data: Partial<Omit<ImageMetadata, 'id' | 'file' | 'preview'>>) => void;
  removeImage: (id: string) => Promise<void>;
  toggleImageSelection: (id: string) => void;
  clearSelectedImages: () => void;
  setDefectSortDirection: (direction: 'asc' | 'desc' | null) => void;
  setSketchSortDirection: (direction: 'asc' | 'desc' | null) => void;
  setBulkDefects: (defects: BulkDefect[] | ((prev: BulkDefect[]) => BulkDefect[])) => void;
  reset: () => void;
  getSelectedCounts: () => { sketches: number; defects: number };
  loadUserData: () => Promise<void>;
  saveUserData: () => Promise<void>;
}

// Debounce function
const debounce = <T extends (...args: any[]) => Promise<void>>(func: T, wait: number): T => {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    return new Promise<void>((resolve) => {
      timeout = setTimeout(() => {
        func(...args).then(resolve);
      }, wait);
    });
  }) as T;
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  images: [],
  selectedImages: new Set(),
  formData: initialFormData,
  defectSortDirection: null,
  sketchSortDirection: null,
  bulkDefects: [],

  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
    get().saveUserData();
  },
  
  addImages: async (files, isSketch = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload files to Supabase storage and create image metadata
      const newImages = await Promise.all(files.map(async (file) => {
        const timestamp = new Date().getTime();
        const filePath = `${user.id}/${timestamp}-${file.name}`;

        // Upload file to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('user-project-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL for the file
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
          userId: user.id,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
      }));

      set((state) => ({
        images: [...state.images, ...newImages],
      }));

      // Save project data after successful uploads
      await get().saveUserData();
    } catch (error) {
      console.error('Error adding images:', error);
      throw error;
    }
  },

  setImages: (images) => {
    set(() => ({ images }));
    get().saveUserData();
  },

  updateImageMetadata: (id, data) => {
    set((state) => {
      const updatedImages = state.images.map((img) =>
        img.id === id ? { ...img, ...data } : img
      );
      
      const sortedImages = [...updatedImages].sort((a, b) => {
        if (a.isSketch !== b.isSketch) {
          return a.isSketch ? -1 : 1;
        }
        
        if (a.isSketch && b.isSketch && state.sketchSortDirection) {
          const numA = parseInt(a.photoNumber || '0');
          const numB = parseInt(b.photoNumber || '0');
          return state.sketchSortDirection === 'asc' ? numA - numB : numB - numA;
        }
        
        if (!a.isSketch && !b.isSketch && state.defectSortDirection) {
          const numA = parseInt(a.photoNumber || '0');
          const numB = parseInt(b.photoNumber || '0');
          return state.defectSortDirection === 'asc' ? numA - numB : numB - numA;
        }
        
        return 0;
      });

      get().saveUserData();
      return { images: sortedImages };
    });
  },

  removeImage: async (id) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const imageToRemove = get().images.find(img => img.id === id);
      if (imageToRemove?.publicUrl) {
        // Extract file path from public URL
        const url = new URL(imageToRemove.publicUrl);
        const filePath = decodeURIComponent(url.pathname.split('/').slice(-2).join('/'));
        
        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from('user-project-files')
          .remove([filePath]);

        if (deleteError) throw deleteError;
      }

      set((state) => ({
        images: state.images.filter((img) => img.id !== id),
        selectedImages: new Set([...state.selectedImages].filter(imgId => imgId !== id)),
      }));

      await get().saveUserData();
    } catch (error) {
      console.error('Error removing image:', error);
      throw error;
    }
  },

  toggleImageSelection: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedImages);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      
      get().saveUserData();
      return { selectedImages: newSelected };
    });
  },

  clearSelectedImages: () => {
    set((state) => {
      const updatedImages = state.images.map((img) =>
        state.selectedImages.has(img.id) && !img.isSketch
          ? { ...img, photoNumber: '', description: '' }
          : img
      );
      
      get().saveUserData();
      return {
        selectedImages: new Set(),
        images: updatedImages
      };
    });
  },

  setDefectSortDirection: (direction) =>
    set((state) => {
      const sortedImages = [...state.images].sort((a, b) => {
        if (a.isSketch !== b.isSketch) {
          return a.isSketch ? -1 : 1;
        }
        if (!a.isSketch && !b.isSketch && direction) {
          const numA = parseInt(a.photoNumber || '0');
          const numB = parseInt(b.photoNumber || '0');
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        return 0;
      });

      return {
        defectSortDirection: direction,
        images: sortedImages
      };
    }),

  setSketchSortDirection: (direction) =>
    set((state) => {
      const sortedImages = [...state.images].sort((a, b) => {
        if (a.isSketch !== b.isSketch) {
          return a.isSketch ? -1 : 1;
        }
        if (a.isSketch && b.isSketch && direction) {
          const numA = parseInt(a.photoNumber || '0');
          const numB = parseInt(b.photoNumber || '0');
          return direction === 'asc' ? numA - numB : numB - numA;
        }
        return 0;
      });

      return {
        sketchSortDirection: direction,
        images: sortedImages
      };
    }),

  setBulkDefects: (defects) =>
    set((state) => ({
      bulkDefects: typeof defects === 'function' ? defects(state.bulkDefects) : defects
    })),

  reset: () => {
    set({
      images: [],
      selectedImages: new Set(),
      formData: initialFormData,
      defectSortDirection: null,
      sketchSortDirection: null,
      bulkDefects: []
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
      if (!user) {
        console.error('Not authenticated');
        return;
      }

      // Clear existing state first
      set({
        images: [],
        selectedImages: new Set(),
        formData: initialFormData,
        defectSortDirection: null,
        sketchSortDirection: null,
        bulkDefects: []
      });

      // Load project data
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Get the most recent project if it exists
      const projectData = projects && projects.length > 0 ? projects[0] : null;

      if (projectData) {
        // Load and verify each image
        const validImages = await Promise.all(
          (projectData.images || []).map(async (imgData: any) => {
            try {
              if (!imgData.publicUrl) return null;

              const response = await fetch(imgData.publicUrl);
              if (!response.ok) return null;

              const blob = await response.blob();
              const file = new File([blob], imgData.fileName || 'image.jpg', {
                type: imgData.fileType || blob.type
              });

              return {
                id: imgData.id,
                file,
                photoNumber: imgData.photoNumber || '',
                description: imgData.description || '',
                preview: URL.createObjectURL(blob),
                isSketch: imgData.isSketch || false,
                publicUrl: imgData.publicUrl,
                userId: imgData.userId
              };
            } catch (error) {
              console.error('Error loading image:', error);
              return null;
            }
          })
        );

        // Filter out failed loads
        const images = validImages.filter((img): img is ImageMetadata => img !== null);
        const selectedImages = new Set(projectData.selected_images || []);

        set({
          formData: projectData.form_data || initialFormData,
          images,
          selectedImages
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      throw error;
    }
  },


  saveUserData: debounce(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const state = get();
      
      // Prepare images data for storage
      const imagesData = state.images.map(img => ({
        id: img.id,
        photoNumber: img.photoNumber,
        description: img.description,
        isSketch: img.isSketch,
        publicUrl: img.publicUrl,
        userId: img.userId,
        fileName: img.file?.name || img.fileName,
        fileType: img.file?.type || img.fileType,
        fileSize: img.file?.size || img.fileSize
      }));

      const projectId = crypto.randomUUID();

      // Create new project record
      const { error } = await supabase
        .from('projects')
        .insert({
          id: projectId,
          user_id: user.id,
          form_data: state.formData,
          images: imagesData,
          selected_images: Array.from(state.selectedImages),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  }, 60000),   
}));