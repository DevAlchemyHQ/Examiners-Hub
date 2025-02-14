import { create } from 'zustand';
import { ImageMetadata, FormData } from '../types';
import { supabase } from '../lib/supabase';

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
};

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

export const useMetadataStore = create<MetadataState>((set, get) => {
  // Create a debounced version of saveUserData
  const debouncedSaveUserData = debounce(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const state = get();
      
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
  }, 60000);

  return {
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
      debouncedSaveUserData();
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
            userId: user.id,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          };
        }));

        set((state) => ({
          images: [...state.images, ...newImages],
        }));

        debouncedSaveUserData();
      } catch (error) {
        console.error('Error adding images:', error);
        throw error;
      }
    },

    setImages: (images) => {
      set(() => ({ images }));
      debouncedSaveUserData();
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

        return { images: sortedImages };
      });
      debouncedSaveUserData();
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
        }));

        debouncedSaveUserData();
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
        return { selectedImages: newSelected };
      });
      debouncedSaveUserData();
    },

    clearSelectedImages: () => {
      set((state) => {
        const updatedImages = state.images.map((img) =>
          state.selectedImages.has(img.id) && !img.isSketch
            ? { ...img, photoNumber: '', description: '' }
            : img
        );
        
        return {
          selectedImages: new Set(),
          images: updatedImages
        };
      });
      debouncedSaveUserData();
    },

    setDefectSortDirection: (direction) => {
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
      });
      debouncedSaveUserData();
    },

    setSketchSortDirection: (direction) => {
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
      });
      debouncedSaveUserData();
    },

    setBulkDefects: (defects) => {
      set((state) => ({
        bulkDefects: typeof defects === 'function' ? defects(state.bulkDefects) : defects
      }));
      debouncedSaveUserData();
    },

    reset: () => {
      set({
        images: [],
        selectedImages: new Set(),
        formData: initialFormData,
        defectSortDirection: null,
        sketchSortDirection: null,
        bulkDefects: []
      });
      debouncedSaveUserData();
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

        set({
          images: [],
          selectedImages: new Set(),
          formData: initialFormData,
          defectSortDirection: null,
          sketchSortDirection: null,
          bulkDefects: []
        });

        const { data: projects, error } = await supabase
          .from('projects')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const projectData = projects && projects.length > 0 ? projects[0] : null;

        if (projectData) {
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

    saveUserData: async () => {
      await debouncedSaveUserData();
    }
  };
});