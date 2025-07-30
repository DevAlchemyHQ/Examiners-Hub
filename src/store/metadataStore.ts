import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageService, DatabaseService } from '../lib/services';
import { ImageMetadata, FormData, BulkDefect } from '../types';
import { createZipFile } from '../utils/zipUtils';
import { nanoid } from 'nanoid';
import { convertImageToJpgBase64, convertBlobToBase64 } from '../utils/fileUtils';
import { useProjectStore } from './projectStore';
import { toast } from 'react-toastify';

// Make sure initialFormData is truly empty
const initialFormData: FormData = {
  elr: '',
  structureNo: '',
  date: '',
};

// Add proper interfaces for deleted defects tracking
interface DeletedDefect {
  defect: BulkDefect;
  originalIndex: number;
  deletedAt: Date;
  wasAutoSorted: boolean;
  originalPhotoNumber: string;
}

// We need to separate the state interface from the actions
interface MetadataStateOnly {
  images: ImageMetadata[];
  selectedImages: Set<string>;
  bulkSelectedImages: Set<string>;
  formData: FormData;
  defectSortDirection: 'asc' | 'desc' | null;
  sketchSortDirection: 'asc' | 'desc' | null;
  bulkDefects: BulkDefect[];
  deletedDefects: DeletedDefect[]; // Changed from BulkDefect[] to DeletedDefect[]
  viewMode: 'images' | 'bulk';
  isLoading: boolean;
  isInitialized: boolean;
  isSortingEnabled: boolean;
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
  setDeletedDefects: (defects: DeletedDefect[] | ((prev: DeletedDefect[]) => DeletedDefect[])) => void;
  setIsSortingEnabled: (enabled: boolean) => void;
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
  convertSelectedImagesToBase64: (selectedImageIds: string[]) => Promise<ImageMetadata[]>;
  getDownloadableFile: (image: ImageMetadata) => Promise<File | Blob>;
  createErrorPlaceholder: (image: ImageMetadata) => Blob;
}

// Helper function to get user-specific localStorage keys
const getUserSpecificKeys = () => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
  
  return {
    formData: `clean-app-form-data-${userId}`,
    images: `clean-app-images-${userId}`,
    bulkData: `clean-app-bulk-data-${userId}`,
    selections: `clean-app-selections-${userId}`
  };
};

const initialState: MetadataStateOnly = {
  images: [],
  selectedImages: new Set(),
  bulkSelectedImages: new Set(),
  formData: initialFormData,
  defectSortDirection: null,
  sketchSortDirection: null,
  bulkDefects: [],
  deletedDefects: [],
  viewMode: 'images',
  isLoading: false,
  isInitialized: false,
  isSortingEnabled: true,
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...initialState,

  setFormData: (data) => {
    set((state) => {
      const newFormData = { ...state.formData, ...data };
      
      // Auto-save to localStorage immediately
      const keys = getUserSpecificKeys();
      localStorage.setItem(keys.formData, JSON.stringify(newFormData));
      
      // Auto-save to AWS with throttling to reduce costs
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          // Throttle auto-saves to reduce DynamoDB costs
          const lastSaveTime = localStorage.getItem('last-aws-save');
          const now = Date.now();
          if (lastSaveTime && (now - parseInt(lastSaveTime)) < 30000) { // 30 second throttle
            console.log('⏸️ Throttling auto-save to reduce costs');
            return;
          }
          
          // Get user from localStorage to avoid circular import
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Use static import - save immediately for cross-browser persistence
            await DatabaseService.updateProject(user.email, 'current', { formData: newFormData });
            console.log('✅ Form data saved to AWS for cross-browser persistence:', user.email);
          } else {
            console.log('No user found, skipping AWS save');
          }
        } catch (error) {
          console.error('❌ Error saving form data to AWS:', error);
        }
      })();
      
      return { formData: newFormData };
    });
  },

  addImages: async (files, isSketch = false) => {
    try {
      console.log('🚀 Starting ultra-fast parallel upload of', files.length, 'files');
      
      // Get user info once
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      // Create all image metadata immediately for instant display
      const imageMetadataArray: ImageMetadata[] = files.map((file, index) => {
        const timestamp = Date.now() + index;
        const filePath = `users/${userId}/images/${timestamp}-${file.name}`;
        const consistentId = `local-${timestamp}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
                    // Create temporary metadata with local file for instant display
            return {
              id: consistentId,
              file: file,
              fileName: file.name,
              fileSize: file.size,
              fileType: 'image/jpeg',
              photoNumber: '',
              description: '',
              preview: URL.createObjectURL(file), // Use local blob URL for instant display
              isSketch,
              publicUrl: '', // Will be updated after S3 upload
              userId: userId,
              isUploading: true, // Mark as uploading
            };
      });
      
      // ADD ALL IMAGES TO STATE IMMEDIATELY for instant display
      console.log('⚡ Adding all images to state immediately for instant display');
      set((state) => {
        const combined = [...state.images, ...imageMetadataArray];
        
        // Sort images by photo number (extract number after "00" in filenames like P1080001)
        combined.sort((a, b) => {
          const aFileName = a.fileName || a.file?.name || '';
          const bFileName = b.fileName || b.file?.name || '';
          
          // Extract photo number from filenames like P1080001, P1080005, etc.
          const extractPhotoNumber = (filename: string) => {
            // Look for pattern like P1080001, P1080005, etc.
            const match = filename.match(/P\d{3}00(\d+)/);
            if (match) {
              return parseInt(match[1]);
            }
            return null;
          };
          
          const aPhotoNum = extractPhotoNumber(aFileName);
          const bPhotoNum = extractPhotoNumber(bFileName);
          
          // If both have photo numbers, sort by them
          if (aPhotoNum !== null && bPhotoNum !== null) {
            return aPhotoNum - bPhotoNum; // Lowest number first
          }
          
          // If only one has a photo number, put the one without photo number last
          if (aPhotoNum !== null && bPhotoNum === null) {
            return -1; // a comes first
          }
          if (aPhotoNum === null && bPhotoNum !== null) {
            return 1; // b comes first
          }
          
          // If neither has photo numbers, fall back to timestamp sorting
          const aTimestamp = parseInt(a.s3Key?.split('-')[0] || '0');
          const bTimestamp = parseInt(b.s3Key?.split('-')[0] || '0');
          
          if (!isNaN(aTimestamp) && !isNaN(bTimestamp)) {
            return aTimestamp - bTimestamp; // Oldest first
          }
          
          // Final fallback to filename comparison
          return aFileName.localeCompare(bFileName);
        });
        
        // Save to localStorage
        try {
          const projectStore = useProjectStore.getState();
          if (!projectStore.isClearing) {
            localStorage.setItem('clean-app-images', JSON.stringify(combined));
            console.log('📱 Images saved to localStorage:', combined.length);
          }
        } catch (error) {
          console.error('❌ Error saving images to localStorage:', error);
        }
        
        console.log('✅ All images added to state immediately');
        return { images: combined };
      });
      
      // Now upload to S3 in parallel (background process)
      console.log('🔄 Starting parallel S3 uploads in background...');
      const uploadPromises = files.map(async (file, index) => {
        try {
          const timestamp = Date.now() + index;
          const filePath = `users/${userId}/images/${timestamp}-${file.name}`;
          
          console.log(`📤 Uploading to S3: ${file.name}`);
          const uploadResult = await StorageService.uploadFile(file, filePath);
          
          if (uploadResult.error) {
            throw new Error(`Upload failed for ${file.name}: ${uploadResult.error}`);
          }
          
          console.log(`✅ S3 upload successful: ${file.name}`);
          
          // Update the image metadata with S3 URL but keep local file for downloads
          const consistentId = `local-${timestamp}-${file.name.replace(/[^a-zA-Z0-9]/g, '-')}`;
          
          set((state) => {
            const updatedImages = state.images.map(img => 
              img.id === consistentId 
                ? { 
                    ...img, 
                    preview: uploadResult.url!, // Use S3 URL for display
                    publicUrl: uploadResult.url!,
                    isUploading: false,
                    s3Key: `${timestamp}-${file.name}`, // Store the S3 filename for downloads
                    // Keep original file reference for immediate download
                    file: img.file // Also keep original file reference for immediate download
                  }
                : img
            );
            
            // Save updated state
            try {
              const projectStore = useProjectStore.getState();
              if (!projectStore.isClearing) {
                localStorage.setItem('clean-app-images', JSON.stringify(updatedImages));
              }
            } catch (error) {
              console.error('❌ Error saving updated images to localStorage:', error);
            }
            
            return { images: updatedImages };
          });
          
          return uploadResult;
        } catch (error) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          throw error;
        }
      });
      
      // Wait for all uploads to complete
      await Promise.all(uploadPromises);
      console.log(`🎉 All ${files.length} S3 uploads completed successfully!`);
      
    } catch (error: any) {
      console.error('❌ Error in ultra-fast upload:', error);
      throw error;
    }
  },

  updateImageMetadata: async (id, data) => {
    set((state) => {
      // Check for duplicate photo numbers if photoNumber is being updated
      if (data.photoNumber !== undefined) {
        const newPhotoNumber = parseInt(data.photoNumber) || 0;
        if (newPhotoNumber > 0) {
          const hasDuplicate = state.images.some(img => 
            img.id !== id && 
            parseInt(img.photoNumber || '0') === newPhotoNumber
          );
          if (hasDuplicate) {
            console.warn('Duplicate photo number detected:', newPhotoNumber);
            // Don't update if duplicate found - let the UI handle the error
            return { images: state.images };
          }
        }
      }
      
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
        // Simply add the image to selection - no validation here
            newSelected.add(id);
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
                fileName: image?.file?.name || 'unknown'
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
    set((state) => {
      // Auto-save to localStorage immediately (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          const selectedWithFilenames = Array.from(selectedImages).map(id => {
            const image = state.images.find(img => img.id === id);
            return {
              id,
              fileName: image?.file?.name || 'unknown'
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
            const selectedWithFilenames = Array.from(selectedImages).map(id => {
              const image = state.images.find(img => img.id === id);
              return {
                id,
                fileName: image?.file?.name || 'unknown'
              };
            });
            await DatabaseService.updateSelectedImages(user.email, selectedWithFilenames);
            console.log('✅ Selected images auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving selected images:', error);
        }
      })();
      
      return { selectedImages };
    });
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
          const keys = getUserSpecificKeys();
        localStorage.setItem(keys.bulkData, JSON.stringify(newBulkDefects));
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

  setDeletedDefects: (defects) => {
    set((state) => {
      const newDeletedDefects = typeof defects === 'function' ? defects(state.deletedDefects) : defects;
      
      // Auto-save to localStorage immediately (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          const keys = getUserSpecificKeys();
          localStorage.setItem(`${keys.bulkData}-deleted`, JSON.stringify(newDeletedDefects));
          console.log('📱 Deleted defects saved to localStorage:', newDeletedDefects.length);
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving deleted defects to localStorage:', error);
      }
      
      return { deletedDefects: newDeletedDefects };
    });
  },

  setIsSortingEnabled: (enabled) => {
    set({ isSortingEnabled: enabled });
  },

  reset: () => {
    console.log('🔄 Resetting metadata store...');
    
    // Clear bulk data first
    get().clearBulkData();
    
    // Reset state
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
    
    // Clear user-specific viewMode keys
    const keys = getUserSpecificKeys();
    try {
      localStorage.removeItem(`${keys.formData}-viewMode`);
      console.log('🗑️ Cleared viewMode from localStorage');
    } catch (error) {
      console.error('Error removing viewMode key:', error);
    }
    
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
      
      // Check if user has changed - don't load data for different user
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      const currentUserEmail = currentUser?.email;
      
      // Get the user email that was used to save the data
      const savedUserEmail = localStorage.getItem('userEmail');
      
      if (currentUserEmail && savedUserEmail && currentUserEmail !== savedUserEmail) {
        console.log('🔄 User changed, clearing old data and skipping loadUserData');
        // Clear all data for the old user
        get().reset();
        return;
      }
      
      // Set loading state
      set({ isLoading: true });
      
      // Get user from localStorage
      const user = currentUser;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      // Create user-specific localStorage keys to prevent data leakage
      const userSpecificKeys = {
        formData: `clean-app-form-data-${userId}`,
        images: `clean-app-images-${userId}`,
        bulkData: `clean-app-bulk-data-${userId}`,
        selections: `clean-app-selections-${userId}`
      };
      
      console.log('Loading data for user:', userId);
      
      // Load all data in parallel and batch state updates
      const [formDataResult, bulkDataResult, imagesResult, selectionsResult] = await Promise.allSettled([
        // Load form data from localStorage first, then AWS
        (async () => {
          try {
            const savedFormData = localStorage.getItem(userSpecificKeys.formData);
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
            const savedBulkData = localStorage.getItem(userSpecificKeys.bulkData);
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
                  
                  // Generate consistent ID based on filename to maintain selections
                  const consistentId = `s3-${originalFileName.replace(/[^a-zA-Z0-9]/g, '-')}`;
                  
                  // Create image metadata with S3 URL (no base64 conversion on load!)
                  // Extract original filename from the S3 key
                  const keyParts = file.name.split('-');
                  const extractedFileName = keyParts.slice(1).join('-');
                  
                  const imageMetadata: ImageMetadata = {
                    id: consistentId,
                    fileName: extractedFileName,
                    fileSize: file.size,
                    fileType: 'image/jpeg',
                    photoNumber: '',
                    description: '',
                    preview: file.url, // Use S3 URL for instant display
                    isSketch: false,
                    publicUrl: file.url,
                    userId: userId,
                    s3Key: file.name, // Store just the filename for downloads
                    // No base64 - only convert when needed for downloads
                  };
                  
                  loadedImages.push(imageMetadata);
                } catch (error) {
                  console.error('Error processing S3 file:', file.name, error);
                }
              }
              
              // Sort images by photo number (extract number after "00" in filenames like P1080001)
              loadedImages.sort((a, b) => {
                const aFileName = a.fileName || '';
                const bFileName = b.fileName || '';
                
                // Extract photo number from filenames like P1080001, P1080005, etc.
                const extractPhotoNumber = (filename: string) => {
                  // Look for pattern like P1080001, P1080005, etc.
                  const match = filename.match(/P\d{3}00(\d+)/);
                  if (match) {
                    return parseInt(match[1]);
                  }
                  return null;
                };
                
                const aPhotoNum = extractPhotoNumber(aFileName);
                const bPhotoNum = extractPhotoNumber(bFileName);
                
                // If both have photo numbers, sort by them
                if (aPhotoNum !== null && bPhotoNum !== null) {
                  return aPhotoNum - bPhotoNum; // Lowest number first
                }
                
                // If only one has a photo number, put the one without photo number last
                if (aPhotoNum !== null && bPhotoNum === null) {
                  return -1; // a comes first
                }
                if (aPhotoNum === null && bPhotoNum !== null) {
                  return 1; // b comes first
                }
                
                // If neither has photo numbers, fall back to timestamp sorting
                const aTimestamp = parseInt(a.s3Key?.split('-')[0] || '0');
                const bTimestamp = parseInt(b.s3Key?.split('-')[0] || '0');
                
                if (!isNaN(aTimestamp) && !isNaN(bTimestamp)) {
                  return aTimestamp - bTimestamp; // Oldest first
                }
                
                // Final fallback to filename comparison
                return aFileName.localeCompare(bFileName);
              });
              
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
            
            // Auto-recovery: Try to restore local files from S3 for missing files
            const imagesWithRecovery = await Promise.all(
              imagesWithConsistentIds.map(async (img: any) => {
                if (!img.file && !img.localFile && (img.preview || img.publicUrl)) {
                  console.log('🔄 Attempting to restore local file from S3:', img.fileName || img.file?.name || 'unknown');
                  try {
                    const response = await fetch(img.preview || img.publicUrl);
                    if (response.ok) {
                      const blob = await response.blob();
                      img.localFile = blob;
                      console.log('✅ Successfully restored local file from S3');
                    }
                  } catch (error) {
                    console.warn('⚠️ Could not restore local file from S3:', error);
                  }
                }
                return img;
              })
            );
            
            return imagesWithRecovery;
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
      
      // Restore viewMode from localStorage
      const savedViewMode = localStorage.getItem(`${userSpecificKeys.formData}-viewMode`);
      if (savedViewMode && (savedViewMode === 'images' || savedViewMode === 'bulk')) {
        updates.viewMode = savedViewMode as 'images' | 'bulk';
        console.log('💾 ViewMode restored from localStorage:', savedViewMode);
      } else {
        // Default to bulk if user has bulk defects, otherwise images
        if (bulkDataResult.status === 'fulfilled' && bulkDataResult.value.length > 0) {
          updates.viewMode = 'bulk';
          console.log('💾 Defaulting to bulk view (user has bulk defects)');
        } else {
          updates.viewMode = 'images';
          console.log('💾 Defaulting to images view (no bulk defects)');
        }
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
        // Convert selections to Set of IDs with improved matching
        const selectedImageIds = new Set<string>();
        const loadedImages = imagesResult.status === 'fulfilled' ? imagesResult.value : [];
        
        selectionsResult.value.forEach((selectedItem: any) => {
          // Handle both localStorage format (id) and DynamoDB format (imageId)
          const selectedId = typeof selectedItem === 'string' ? selectedItem : (selectedItem.id || selectedItem.imageId);
          const selectedFileName = selectedItem.fileName || selectedItem.file?.name || 'unknown';
          
          if (selectedId) {
            // First try to match by ID
            const imageById = loadedImages.find((img: any) => img.id === selectedId);
            if (imageById) {
              selectedImageIds.add(selectedId);
              console.log('✅ Matched selected image by ID:', selectedId);
            } else {
              // Fallback: try to match by filename
              const imageByFileName = loadedImages.find((img: any) => 
                (img.fileName || img.file?.name || '') === selectedFileName
              );
              if (imageByFileName) {
                selectedImageIds.add(imageByFileName.id);
                console.log('✅ Matched selected image by filename:', selectedFileName, '→', imageByFileName.id);
              } else {
                console.warn('⚠️ Could not match selected image:', selectedFileName);
              }
            }
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
    
    // Save viewMode to localStorage for persistence
    const keys = getUserSpecificKeys();
    localStorage.setItem(`${keys.formData}-viewMode`, mode);
    console.log('💾 ViewMode saved to localStorage:', mode);
  },

  saveBulkData: async () => {
    try {
      const state = get();
      const { bulkDefects } = state;
      
      // Get user for user-specific keys
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      // Save to user-specific localStorage
      localStorage.setItem(`clean-app-bulk-data-${userId}`, JSON.stringify(bulkDefects));
      
      // Save to AWS DynamoDB for cross-device persistence
      if (userId !== 'anonymous') {
        // Use static import
        await DatabaseService.updateBulkDefects(userId, bulkDefects);
        console.log('Bulk defects saved to AWS for user:', userId);
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
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      // Check if we're in the middle of clearing a project
      const projectStore = useProjectStore.getState();
      if (projectStore.isClearing) {
        console.log('⏸️ Skipping loadBulkData during project clear');
        return;
      }
      
      // Create user-specific localStorage keys
      const userSpecificKeys = {
        bulkData: `clean-app-bulk-data-${userId}`
      };
      
      // Try localStorage first (consistent with loadUserData)
      const savedBulkData = localStorage.getItem(userSpecificKeys.bulkData);
      if (savedBulkData) {
        try {
          const bulkDefects = JSON.parse(savedBulkData);
          if (bulkDefects && bulkDefects.length > 0) {
            set({ bulkDefects });
            console.log('📱 Bulk defects loaded from localStorage');
            return;
          }
        } catch (error) {
          console.error('Error parsing localStorage bulk data:', error);
        }
      }
      
      // Try AWS if no localStorage data, but with better error handling
      if (userId !== 'anonymous') {
        try {
          console.log('🔄 Trying AWS for bulk data...');
          const { defects } = await DatabaseService.getBulkDefects(userId);
          if (defects && defects.length > 0) {
            set({ bulkDefects: defects });
            console.log('✅ Bulk defects loaded from AWS for user:', userId);
            return;
          } else {
            console.log('No bulk defects found in AWS for user:', userId);
          }
        } catch (error) {
          console.warn('⚠️ AWS load failed, continuing with empty state:', error);
          
          // If it's a performance issue, log it specifically
          if (error instanceof Error && error.message.includes('ProvisionedThroughputExceededException')) {
            console.warn('🚨 AWS DynamoDB performance issue detected. Consider increasing table capacity.');
          }
        }
      }
      
      // Fallback to empty state
      console.log('📱 No bulk defects found, starting with empty state');
      set({ bulkDefects: [] });
    } catch (error) {
      console.error('Error loading bulk data:', error);
      set({ bulkDefects: [] });
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

      // Prepare selected images for download using smart fallback
      const selectedImageIds = defectsWithImages.map(defect => {
        const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        return image?.id;
      }).filter(Boolean) as string[];
      
      const preparedImages = await get().convertSelectedImagesToBase64(selectedImageIds);
      
      // Use the prepared images directly for download
      const selectedImageMetadata = defectsWithImages.map(defect => {
        const image = preparedImages.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
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
        const image = preparedImages.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
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

  // Create error placeholder when file is not available
  createErrorPlaceholder: (image: ImageMetadata): Blob => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;
    
    // Draw error message on canvas
    ctx!.fillStyle = '#f0f0f0';
    ctx!.fillRect(0, 0, 400, 300);
    ctx!.fillStyle = '#666';
    ctx!.font = '16px Arial';
    ctx!.textAlign = 'center';
    ctx!.fillText('Image not available', 200, 140);
    ctx!.fillText('File: ' + (image.fileName || image.file?.name || 'unknown'), 200, 170);
    ctx!.fillText('Please refresh to reload', 200, 200);
    
    // Convert to blob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create error placeholder'));
        }
      }, 'image/jpeg', 0.9);
    });
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

  // Smart file detection with fallback system (no base64 conversion)
  getDownloadableFile: async (image: ImageMetadata): Promise<File | Blob> => {
    console.log('🔍 Finding best file source for:', image.fileName || image.file?.name || 'unknown');
    
    // Priority 1: Local file (fastest, no conversion)
    if (image.file || (image as any).localFile) {
      console.log('✅ Using local file for immediate download');
      return image.file || (image as any).localFile;
    }
    
    // Priority 2: Try to get from localStorage if available
    try {
      const storedImages = localStorage.getItem('clean-app-images');
      if (storedImages) {
        const parsedImages = JSON.parse(storedImages);
        const storedImage = parsedImages.find((img: any) => img.id === image.id);
        if (storedImage && storedImage.file) {
          console.log('✅ Found local file in localStorage');
          return storedImage.file;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking localStorage:', error);
    }
    
    // Priority 3: Try to match by filename in localStorage (for cross-session matching)
    try {
      const storedImages = localStorage.getItem('clean-app-images');
      if (storedImages) {
        const parsedImages = JSON.parse(storedImages);
        const storedImage = parsedImages.find((img: any) => 
          (img.fileName || img.file?.name || '') === (image.fileName || image.file?.name || '')
        );
        if (storedImage && storedImage.file) {
          console.log('✅ Found local file by filename match');
          return storedImage.file;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error checking localStorage by filename:', error);
    }
    
    // Priority 4: S3 URL (reliable fallback) - but skip if CORS issues
    if (image.preview || image.publicUrl) {
      console.log('📡 Fetching from S3 for download...');
      try {
        const response = await fetch(image.preview || image.publicUrl);
        if (response.ok) {
          const blob = await response.blob();
          console.log('✅ Successfully fetched from S3 for download');
          return blob;
        }
      } catch (error) {
        console.warn('⚠️ S3 fetch failed (likely CORS):', error);
        // Don't retry S3 if it fails - go straight to placeholder
      }
    }
    
    // Priority 5: Error placeholder (never fails)
    console.log('❌ Creating error placeholder for download');
    return get().createErrorPlaceholder(image);
  },

  // Prepare selected images for download using smart fallback
  convertSelectedImagesToBase64: async (selectedImageIds: string[]): Promise<ImageMetadata[]> => {
    try {
      console.log('🚀 Preparing selected images for download using smart fallback...');
      const state = get();
      const { images } = state;
      
      const selectedImages = images.filter(img => selectedImageIds.includes(img.id));
      console.log(`Preparing ${selectedImages.length} selected images for download`);
      
      // Get downloadable files for each selected image
      const imagesWithFiles = await Promise.all(
        selectedImages.map(async (img) => {
          const downloadableFile = await get().getDownloadableFile(img);
          return {
            ...img,
            downloadableFile // Add the file for download
          };
        })
      );
      
      console.log('✅ Selected images prepared for download using smart fallback');
      return imagesWithFiles;
      
    } catch (error) {
      console.error('Error preparing images for download:', error);
      throw error;
    }
  },

  clearBulkData: () => {
    console.log('🗑️ Clearing bulk data...');
    
    // Clear state
    set({ bulkDefects: [], deletedDefects: [] });
    
    // Get user for user-specific keys
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
    
    // Clear user-specific localStorage keys
    const userSpecificKeys = [
      `clean-app-bulk-data-${userId}`,
      'clean-app-bulk-data', // Legacy key
      'bulk-data',
      'defectSets'
    ];
    
    userSpecificKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removed bulk data key: ${key}`);
      } catch (error) {
        console.error(`Error removing bulk data key ${key}:`, error);
      }
    });
    
    console.log('✅ Bulk data cleared from all sources');
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