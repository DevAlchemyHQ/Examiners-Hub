import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageService, DatabaseService } from '../lib/services';
import { ImageMetadata, FormData, BulkDefect } from '../types';
import { createZipFile } from '../utils/zipUtils';
import { nanoid } from 'nanoid';
import { convertImageToJpgBase64, convertBlobToBase64 } from '../utils/fileUtils';
import { useProjectStore } from './projectStore';

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
  isLoading: boolean;
  isInitialized: boolean;
}

// Combine state and actions
interface MetadataState extends MetadataStateOnly {
  setFormData: (data: Partial<FormData>) => void;
  addImages: (files: File[], isSketch?: boolean) => Promise<void>;
  updateImageMetadata: (id: string, data: Partial<Omit<ImageMetadata, 'id' | 'file' | 'preview'>>) => Promise<void>;
  removeImage: (id: string) => Promise<void>;
  toggleImageSelection: (id: string) => void;
  toggleBulkImageSelection: (id: string) => void;
  setSelectedImages: (selectedImages: Set<string>) => void;
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
  savePdf: (userId: string, pdfData: any) => Promise<void>;
  loadSavedPdfs: (userId: string) => Promise<any[]>;
  processImageForDownload: (imageFile: File) => Promise<Blob>;
  convertImagesToBase64: () => Promise<void>;
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
  isLoading: false,
  isInitialized: false,
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...initialState,

  setFormData: (data) => {
    set((state) => {
      const newFormData = { ...state.formData, ...data };
      
      // Auto-save to localStorage immediately
      localStorage.setItem('clean-app-form-data', JSON.stringify(newFormData));
      
      // Auto-save to AWS in background (using static import) - but only if not clearing
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          // Get user from localStorage to avoid circular import
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Use static import
            await DatabaseService.updateProject(user.email, 'current', { formData: newFormData });
            console.log('✅ Form data auto-saved to AWS for user:', user.email);
          } else {
            console.log('No user found, skipping AWS save');
          }
        } catch (error) {
          console.error('❌ Error auto-saving form data:', error);
        }
      })();
      
      return { formData: newFormData };
    });
  },

  addImages: async (files, isSketch = false) => {
    try {
      console.log('addImages called with', files.length, 'files');
      
      // Upload files to S3 and create image metadata
      const newImages: ImageMetadata[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, file.name);
        
        // Create unique file path with user ID
        const timestamp = Date.now();
        // Get user from localStorage to avoid circular import
        const storedUser = localStorage.getItem('user');
        const user = storedUser ? JSON.parse(storedUser) : null;
        const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
        const filePath = `users/${userId}/images/${timestamp}-${file.name}`;
        
        try {
          // Upload to S3 using StorageService
          const uploadResult = await StorageService.uploadFile(file, filePath);
          
          if (uploadResult.error) {
            console.error('Upload failed for', file.name, uploadResult.error);
            throw new Error(`Upload failed for ${file.name}: ${uploadResult.error}`);
          } else {
            // Convert image to JPG and store as base64 in localStorage
            const jpgBase64 = await convertImageToJpgBase64(file);
            
            // Generate consistent ID based on filename to maintain selections across browsers
            const consistentId = `local-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
            
            const imageMetadata: ImageMetadata = {
              id: consistentId,
              file: file, // Keep the original file for new uploads
              fileName: file.name,
              fileSize: file.size,
              fileType: 'image/jpeg',
              photoNumber: '',
              description: '',
              preview: URL.createObjectURL(file), // Local preview for new uploads
              isSketch,
              publicUrl: uploadResult.url!, // S3 signed URL
              userId: userId, // Use actual user ID
              base64: jpgBase64 // Store JPG as base64 for reliable downloads
            };
            
            newImages.push(imageMetadata);
            console.log(`✅ Uploaded ${file.name} to S3 and converted to JPG for user ${userId}`);
          }
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          throw error; // Re-throw to stop the process
        }
      }

      console.log('All files uploaded to S3 and converted to JPG, updating state...');
      set((state) => {
        // Combine and sort images by photoNumber (asc), fallback to filename
        const combined = [...state.images, ...newImages];
        combined.sort((a, b) => {
          const aNum = parseInt(a.photoNumber);
          const bNum = parseInt(b.photoNumber);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return (a.fileName || a.file?.name || '').localeCompare(b.fileName || b.file?.name || '');
        });
        
        // Save images to localStorage for persistence (but not during clearing)
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (!projectStore.isClearing) {
            localStorage.setItem('clean-app-images', JSON.stringify(combined));
            console.log('📱 Images saved to localStorage:', combined.length);
          } else {
            console.log('⏸️ Skipping localStorage save during project clear');
          }
        } catch (error) {
          console.error('❌ Error saving images to localStorage:', error);
        }
        
        console.log('State updated with', combined.length, 'total images');
        return { images: combined };
      });

      console.log('Upload process completed successfully');
    } catch (error: any) {
      console.error('Error adding images:', error);
      throw error;
    }
  },

  updateImageMetadata: async (id, data) => {
    set((state) => {
      const updatedImages = state.images.map((img) =>
        img.id === id ? { ...img, ...data } : img
      );
      
      // Save to localStorage for immediate persistence (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          localStorage.setItem('clean-app-images', JSON.stringify(updatedImages));
          console.log('📱 Image metadata saved to localStorage for image:', id);
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving image metadata to localStorage:', error);
      }
      
      // Auto-save to AWS in background (only metadata, not full images) - but only if not clearing
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Save only the metadata changes, not the full images array
            const imageMetadata = updatedImages.map(img => ({
              id: img.id,
              photoNumber: img.photoNumber,
              description: img.description,
              isSketch: img.isSketch,
              fileName: img.fileName || img.file?.name || 'unknown'
            }));
            
            await DatabaseService.updateProject(user.email, 'current', { 
              imageMetadata: imageMetadata
            });
            console.log('✅ Image metadata auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving image metadata:', error);
        }
      })();
      
      return { images: updatedImages };
    });
  },

  removeImage: async (id) => {
    try {
      set((state) => {
        const updatedImages = state.images.filter((img) => img.id !== id);
        const updatedSelected = new Set([...state.selectedImages].filter(imgId => imgId !== id));
        const updatedBulkSelected = new Set([...state.bulkSelectedImages].filter(imgId => imgId !== id));
        
        return { 
          images: updatedImages,
          selectedImages: updatedSelected,
          bulkSelectedImages: updatedBulkSelected,
        };
      });
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
        // Add to the beginning if we have a sort direction
        if (state.defectSortDirection === 'asc') {
          newSelected = new Set([id, ...newSelected]);
        } else if (state.defectSortDirection === 'desc') {
          newSelected = new Set([...newSelected, id]);
        } else {
          // No sort direction, just add to the end
          newSelected.add(id);
        }
      }
      
      // Auto-save selections to localStorage immediately with filenames for cross-session matching (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          const selectedWithFilenames = Array.from(newSelected).map(id => {
            const image = state.images.find(img => img.id === id);
            return {
              id,
              fileName: image?.fileName || image?.file?.name || 'unknown'
            };
          });
          localStorage.setItem('clean-app-selected-images', JSON.stringify(selectedWithFilenames));
          console.log('📱 Selected images saved to localStorage:', selectedWithFilenames);
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving selected images to localStorage:', error);
      }
      
      // Auto-save to AWS in background (only small data) - but only if not clearing
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            const selectedWithFilenames = Array.from(newSelected).map(id => {
              const image = state.images.find(img => img.id === id);
              return {
                id,
                fileName: image?.fileName || image?.file?.name || 'unknown'
              };
            });
            await DatabaseService.updateSelectedImages(user.email, selectedWithFilenames);
            console.log('✅ Selected images auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving selected images:', error);
        }
      })();
      
      return { selectedImages: newSelected };
    });
  },

  toggleBulkImageSelection: (id) => {
    set((state) => {
      let newSelected = new Set(state.bulkSelectedImages);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { bulkSelectedImages: newSelected };
    });
  },

  setSelectedImages: (selectedImages) => {
    set({ selectedImages });
  },

  clearSelectedImages: () => {
    set({ selectedImages: new Set() });
  },

  clearBulkSelectedImages: () => {
    set({ bulkSelectedImages: new Set() });
  },

  setDefectSortDirection: (direction) => {
    set({ defectSortDirection: direction });
  },

  setSketchSortDirection: (direction) => {
    set({ sketchSortDirection: direction });
  },

  setBulkDefects: (defects) => {
    set((state) => {
      const newBulkDefects = typeof defects === 'function' ? defects(state.bulkDefects) : defects;
      
      // Auto-save to localStorage immediately (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          localStorage.setItem('clean-app-bulk-data', JSON.stringify(newBulkDefects));
          console.log('📱 Bulk defects saved to localStorage');
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving bulk defects to localStorage:', error);
      }
      
      // Auto-save to AWS in background - but only if not clearing
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Use static import
            await DatabaseService.updateBulkDefects(user.email, newBulkDefects);
            console.log('✅ Bulk defects auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving bulk defects:', error);
        }
      })();
      
      return { bulkDefects: newBulkDefects };
    });
  },

  reset: () => {
    set(initialState);
    
    // Clear ALL localStorage keys related to metadata store
    const keysToRemove = [
      'clean-app-images',
      'clean-app-form-data',
      'clean-app-bulk-data',
      'clean-app-selected-images',
      'clean-app-selections',
      'viewMode',
      'selected-images',
      'project-data',
      'form-data',
      'image-selections',
      'bulk-data',
      'metadata-storage'
    ];
    
    console.log('🗑️ Clearing metadata store localStorage keys...');
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (error) {
        console.error(`Error removing key ${key}:`, error);
      }
    });
    
    console.log('✅ Metadata store reset completed');
  },

  getSelectedCounts: () => {
    const state = get();
    const selectedImagesList = state.images.filter(img => state.selectedImages.has(img.id));
    const sketches = selectedImagesList.filter(img => img.isSketch).length;
    const defects = selectedImagesList.filter(img => !img.isSketch).length;
    return { sketches, defects };
  },

  loadUserData: async () => {
    try {
      console.log('Loading user data...');
      
      // Check if project is being cleared - don't load data during clearing
      const projectStore = useProjectStore.getState();
      if (projectStore.isClearing) {
        console.log('⏸️ Skipping loadUserData during project clear');
        return;
      }
      
      // Set loading state
      set({ isLoading: true });
      
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      console.log('Loading data for user:', userId);
      
      // Load all data in parallel and batch state updates
      const [formDataResult, bulkDataResult, imagesResult, selectionsResult] = await Promise.allSettled([
        // Load form data from localStorage first, then AWS
        (async () => {
          try {
            const savedFormData = localStorage.getItem('clean-app-form-data');
            if (savedFormData) {
              const formData = JSON.parse(savedFormData);
              console.log('📱 Form data loaded from localStorage');
              return formData;
            }
            
            if (userId !== 'anonymous') {
              const { project } = await DatabaseService.getProject(userId, 'current');
              if (project?.formData) {
                console.log('✅ Form data loaded from AWS for user:', userId);
                return project.formData;
              }
            }
            return null;
          } catch (error) {
            console.error('❌ Error loading form data:', error);
            return null;
          }
        })(),
        
        // Load bulk data from localStorage first, then AWS
        (async () => {
          try {
            const savedBulkData = localStorage.getItem('clean-app-bulk-data');
            if (savedBulkData) {
              const bulkDefects = JSON.parse(savedBulkData);
              console.log('📱 Bulk defects loaded from localStorage');
              return bulkDefects;
            }
            
            if (userId !== 'anonymous') {
              const { defects } = await DatabaseService.getBulkDefects(userId);
              if (defects && defects.length > 0) {
                console.log('✅ Bulk defects loaded from AWS for user:', userId);
                return defects;
              }
            }
            return [];
          } catch (error) {
            console.error('❌ Error loading bulk data:', error);
            return [];
          }
        })(),
        
        // Load images from S3 first, then localStorage as fallback
        (async () => {
          try {
            if (userId !== 'anonymous') {
              console.log('Loading images from S3 for user:', userId);
              const { files, error } = await StorageService.listFiles(`users/${userId}/images/`);
              
              if (error) {
                console.error('Error listing S3 files:', error);
              } else if (files && files.length > 0) {
                console.log('Found', files.length, 'images in S3');
                
                const loadedImages: ImageMetadata[] = [];
                
                for (const file of files) {
                  try {
                    const originalFileName = file.name.split('-').slice(1).join('-');
                    
                    // Try to convert S3 image to base64 for reliable downloads
                    let base64Data: string | undefined;
                    try {
                      console.log('Converting S3 image to base64:', originalFileName);
                      const response = await fetch(file.url);
                      if (response.ok) {
                        const blob = await response.blob();
                        const base64 = await convertBlobToBase64(blob);
                        base64Data = base64;
                        console.log('Successfully converted S3 image to base64:', originalFileName);
                      }
                    } catch (error) {
                      console.error('Failed to convert S3 image to base64:', originalFileName, error);
                    }
                    
                    // Generate consistent ID based on filename to maintain selections
                    const consistentId = `s3-${originalFileName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                    
                    const imageMetadata: ImageMetadata = {
                      id: consistentId,
                      fileName: originalFileName,
                      fileSize: file.size,
                      fileType: 'image/jpeg',
                      photoNumber: '',
                      description: '',
                      preview: file.url,
                      isSketch: false,
                      publicUrl: file.url,
                      userId: userId,
                      base64: base64Data // Store base64 for reliable downloads
                    };
                    
                    loadedImages.push(imageMetadata);
                  } catch (error) {
                    console.error('Error processing S3 file:', file.name, error);
                  }
                }
                
                console.log('✅ Images loaded from S3 for user:', userId);
                return loadedImages;
              }
            }
            
            // Fallback to localStorage
            const savedImages = localStorage.getItem('clean-app-images');
            if (savedImages) {
              const images = JSON.parse(savedImages);
              console.log('📱 Images loaded from localStorage (fallback):', images.length);
              
              // Ensure all localStorage images have consistent IDs
              const imagesWithConsistentIds = images.map((img: any) => ({
                ...img,
                id: img.id || `local-${(img.fileName || img.file?.name || 'unknown').replace(/[^a-zA-Z0-9]/g, '-')}`
              }));
              
              return imagesWithConsistentIds;
            }
            
            console.log('No images found in S3 or localStorage');
            return [];
          } catch (error) {
            console.error('❌ Error loading images:', error);
            return [];
          }
        })(),
          
          // Load saved selections from localStorage first, then AWS (matching bulk data pattern)
          (async () => {
            try {
              // Try localStorage first (like bulk data)
              const savedSelections = localStorage.getItem('clean-app-selected-images');
              if (savedSelections) {
                const selections = JSON.parse(savedSelections);
                console.log('📱 Selected images loaded from localStorage:', selections);
                return selections;
              }
              
              // Try AWS if no localStorage (like bulk data)
              if (userId !== 'anonymous') {
                const { selectedImages } = await DatabaseService.getSelectedImages(userId);
                if (selectedImages && selectedImages.length > 0) {
                  console.log('✅ Selected images loaded from AWS for user:', userId);
                  return selectedImages;
                }
              }
              
              console.log('No selected images found in localStorage or AWS');
              return [];
            } catch (error) {
              console.error('❌ Error loading selections:', error);
              return [];
            }
          })()
        ]);
      
      // Batch all state updates in one call to prevent flickering
      const updates: Partial<MetadataStateOnly> = {
        isLoading: false,
        isInitialized: true
      };
      
      if (formDataResult.status === 'fulfilled' && formDataResult.value) {
        updates.formData = formDataResult.value;
      }
      
      if (bulkDataResult.status === 'fulfilled' && bulkDataResult.value.length > 0) {
        updates.bulkDefects = bulkDataResult.value;
      }
      
      if (imagesResult.status === 'fulfilled' && imagesResult.value.length > 0) {
        updates.images = imagesResult.value;
        
        // Load image metadata from DynamoDB and apply it to images
        try {
          if (userId !== 'anonymous') {
            const { project } = await DatabaseService.getProject(userId, 'current');
            if (project?.imageMetadata && project.imageMetadata.length > 0) {
              console.log('✅ Image metadata loaded from AWS for user:', userId);
              
              // Apply metadata to images
              const updatedImages = imagesResult.value.map(img => {
                const metadata = project.imageMetadata.find(m => m.id === img.id);
                if (metadata) {
                  return {
                    ...img,
                    photoNumber: metadata.photoNumber || img.photoNumber,
                    description: metadata.description || img.description,
                    isSketch: metadata.isSketch !== undefined ? metadata.isSketch : img.isSketch
                  };
                }
                return img;
              });
              
              updates.images = updatedImages;
              console.log('✅ Applied image metadata from AWS');
            }
          }
        } catch (error) {
          console.error('❌ Error loading image metadata from AWS:', error);
        }
      }
      
      if (selectionsResult.status === 'fulfilled' && selectionsResult.value.length > 0) {
        // Convert selections to Set of IDs (same as bulk data approach)
        const selectedImageIds = new Set<string>();
        
        selectionsResult.value.forEach((selectedItem: any) => {
          // Handle both localStorage format (id) and DynamoDB format (imageId)
          const selectedId = typeof selectedItem === 'string' ? selectedItem : (selectedItem.id || selectedItem.imageId);
          if (selectedId) {
            selectedImageIds.add(selectedId);
          }
        });
        
        updates.selectedImages = selectedImageIds;
        console.log('📱 Selected images loaded and restored:', Array.from(selectedImageIds));
      }
      
      // Single state update to prevent flickering
      set(updates);
      
    } catch (error) {
      console.error('Error loading user data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  saveUserData: async () => {
    try {
      const state = get();
      const { formData } = state;
      
      // Save to localStorage for immediate access
      localStorage.setItem('clean-app-form-data', JSON.stringify(formData));
      
      // Save to AWS DynamoDB for cross-device persistence
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        // Use static import
        await DatabaseService.updateProject(user.email, 'current', { formData });
        console.log('Form data saved to AWS for user:', user.email);
      }
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  saveBulkData: async () => {
    try {
      const state = get();
      const { bulkDefects } = state;
      
      // Save to localStorage for immediate access
      localStorage.setItem('clean-app-bulk-data', JSON.stringify(bulkDefects));
      
      // Save to AWS DynamoDB for cross-device persistence
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        // Use static import
        await DatabaseService.updateBulkDefects(user.email, bulkDefects);
        console.log('Bulk defects saved to AWS for user:', user.email);
      }
    } catch (error) {
      console.error('Error saving bulk data:', error);
    }
  },

  loadBulkData: async () => {
    try {
      console.log('Loading bulk data...');
      
      // Get user from localStorage to avoid dynamic imports
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        try {
          // Use static import
          const { defects } = await DatabaseService.getBulkDefects(user.email);
          if (defects && defects.length > 0) {
            set({ bulkDefects: defects });
            console.log('✅ Bulk defects loaded from AWS for user:', user.email);
            return;
          } else {
            console.log('No bulk defects found in AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error loading from AWS:', error);
        }
      }
      
      // Fallback to localStorage only if no user or AWS failed
      const savedBulkData = localStorage.getItem('clean-app-bulk-data');
      if (savedBulkData) {
        const bulkDefects = JSON.parse(savedBulkData);
        set({ bulkDefects });
        console.log('📱 Bulk defects loaded from localStorage (fallback)');
      } else {
        console.log('No bulk defects found in localStorage');
      }
    } catch (error) {
      console.error('Error loading bulk data:', error);
    }
  },

  generateBulkZip: async () => {
    try {
      console.log('Starting bulk ZIP generation...');
      const state = get();
      const { bulkDefects, images, formData } = state;
      
      if (bulkDefects.length === 0) {
        throw new Error('No bulk defects to download');
      }

      // Filter defects that have selected files
      const defectsWithImages = bulkDefects.filter(defect => defect.selectedFile);
      
      if (defectsWithImages.length === 0) {
        throw new Error('No defects with images selected');
      }

      console.log(`Processing ${defectsWithImages.length} defects with images`);

      // Convert all images to base64 first to ensure reliable downloads
      await get().convertImagesToBase64();
      
      // Get the updated state after conversion
      const updatedState = get();
      const updatedImages = updatedState.images;

      // Get the actual image metadata for selected files
      const selectedImageMetadata = defectsWithImages.map(defect => {
        const image = updatedImages.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (!image) {
          throw new Error(`Image not found for defect ${defect.photoNumber || 'unknown'}`);
        }
        
        // Create a copy of the image metadata with bulk defect data
        return {
          ...image,
          photoNumber: defect.photoNumber || image.photoNumber,
          description: defect.description || image.description
        };
      });

      // Create metadata content for bulk defects
      const metadataContent = defectsWithImages.map(defect => {
        const image = updatedImages.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (!image) {
          throw new Error(`Image not found for defect ${defect.photoNumber || 'unknown'}`);
        }
        
        // Format date as DD-MM-YY
        const formatDate = (dateString: string) => {
          try {
            const date = new Date(dateString);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString().slice(-2); // Get last 2 digits
            return `${day}-${month}-${year}`;
          } catch (error) {
            // Fallback to current date if parsing fails
            const now = new Date();
            const day = now.getDate().toString().padStart(2, '0');
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const year = now.getFullYear().toString().slice(-2);
            return `${day}-${month}-${year}`;
          }
        };
        
        const formattedDate = formatDate(formData.date || new Date().toISOString().slice(0,10));
        
        return `Photo ${defect.photoNumber || '1'} ^ ${defect.description || 'LM'} ^ ${formattedDate}    ${defect.selectedFile}`;
      }).join('\n');

      // Generate filenames
      const metadataFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.txt`;
      const zipFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.zip`;

      console.log('Creating ZIP file with:', {
        imageCount: selectedImageMetadata.length,
        metadataFileName,
        date: formData.date || new Date().toISOString().slice(0,10),
        zipFileName
      });

      try {
        // Try to create ZIP file with processed images
        const zipBlob = await createZipFile(
          selectedImageMetadata,
          metadataFileName,
          metadataContent,
          formData.date || new Date().toISOString().slice(0,10),
          zipFileName
        );

        console.log('ZIP created successfully, size:', zipBlob.size);

        // Trigger download
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Bulk defects downloaded successfully with images');
      } catch (error) {
        console.error('❌ Error creating ZIP with images, trying metadata-only download:', error);
        
        // Fallback: Create ZIP with only metadata file
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Add metadata file
        zip.file(metadataFileName, metadataContent);
        
        // Add image URLs as text file for reference
        const imageUrlsContent = selectedImageMetadata.map(img => 
          `${img.fileName || img.file?.name || 'unknown'}: ${img.preview}`
        ).join('\n');
        zip.file('image_urls.txt', imageUrlsContent);
        
        // Generate and download
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = zipFileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Bulk defects downloaded successfully (metadata only)');
      }
    } catch (error) {
      console.error('❌ Error generating bulk zip:', error);
      throw error;
    }
  },

  // Helper function to process images for download
  processImageForDownload: async (imageFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Set canvas size (maintain aspect ratio, max 1920x1080)
          const maxWidth = 1920;
          const maxHeight = 1080;
          let { width, height } = img;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw image with proper quality
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with high quality JPEG
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image'));
            }
          }, 'image/jpeg', 0.9);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(imageFile);
    });
  },

  // Helper function to convert all existing images to base64
  convertImagesToBase64: async () => {
    try {
      console.log('Converting all existing images to base64...');
      const state = get();
      const { images } = state;
      
      const updatedImages: ImageMetadata[] = [];
      
      for (const image of images) {
        try {
          let base64Data = image.base64;
          
          // If image doesn't have base64 data, try to convert it
          if (!base64Data) {
            console.log('Converting image to base64:', image.fileName || image.file?.name || 'unknown');
            
            if (image.file) {
              // Local file - convert directly
              base64Data = await convertImageToJpgBase64(image.file);
            } else if (image.preview || image.publicUrl) {
              // S3 image - try to fetch and convert
              try {
                const response = await fetch(image.preview || image.publicUrl);
                if (response.ok) {
                  const blob = await response.blob();
                  base64Data = await convertBlobToBase64(blob);
                  console.log('Successfully converted S3 image to base64');
                }
              } catch (error) {
                console.error('Failed to convert S3 image to base64:', error);
              }
            }
          }
          
          // Update image with base64 data
          updatedImages.push({
            ...image,
            base64: base64Data
          });
          
        } catch (error) {
          console.error('Error converting image to base64:', error);
          // Keep the original image even if conversion fails
          updatedImages.push(image);
        }
      }
      
      set({ images: updatedImages });
      console.log('✅ All images converted to base64');
      
    } catch (error) {
      console.error('Error converting images to base64:', error);
    }
  },

  clearBulkData: () => {
    set({ bulkDefects: [] });
    // Clear localStorage for local testing
    localStorage.removeItem('clean-app-bulk-data');
  },

  savePdf: async (userId, pdfData) => {
    try {
      const savedPdfs = localStorage.getItem(`${userId}-saved-pdfs`);
      const existingPdfs = savedPdfs ? JSON.parse(savedPdfs) : [];
      existingPdfs.push(pdfData);
      localStorage.setItem(`${userId}-saved-pdfs`, JSON.stringify(existingPdfs));
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  },

  loadSavedPdfs: async (userId) => {
    try {
      const savedPdfs = localStorage.getItem(`${userId}-saved-pdfs`);
      return savedPdfs ? JSON.parse(savedPdfs) : [];
    } catch (error) {
      console.error('Error loading saved PDFs:', error);
      return [];
    }
  },
}));