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

// Session state interface for comprehensive restoration
interface SessionState {
  lastActiveTab: 'images' | 'bulk';
  lastActiveTime: number;
  imageOrder: string[]; // Array of image IDs in their current order
  selectedImageOrder: string[]; // Array of selected image instance IDs in their current order
  bulkDefectOrder: string[]; // Array of bulk defect IDs in their current order
  panelExpanded: boolean;
  gridWidth: number;
  scrollPositions: {
    imageGrid: number;
    selectedPanel: number;
  };
  formData: FormData; // Add formData to session state
}

// We need to separate the state interface from the actions
interface MetadataStateOnly {
  images: ImageMetadata[];
  selectedImages: Array<{ id: string; instanceId: string }>; // Store both base ID and instance ID
  bulkSelectedImages: string[];
  formData: FormData;
  defectSortDirection: 'asc' | 'desc' | null;
  sketchSortDirection: 'asc' | 'desc' | null;
  bulkDefects: BulkDefect[];
  deletedDefects: DeletedDefect[]; // Changed from BulkDefect[] to DeletedDefect[]
  viewMode: 'images' | 'bulk';
  isLoading: boolean;
  isInitialized: boolean;
  isSortingEnabled: boolean;
  // Store instance-specific metadata for multiple selections
  instanceMetadata: Record<string, { photoNumber?: string; description?: string }>;
  // Session state for comprehensive restoration
  sessionState: SessionState;
}

// Combine state and actions
interface MetadataState extends MetadataStateOnly {
  setFormData: (data: Partial<FormData>) => void;
  addImages: (files: File[], isSketch?: boolean) => Promise<void>;
  updateImageMetadata: (id: string, data: Partial<Omit<ImageMetadata, 'id' | 'file' | 'preview'>>) => Promise<void>;
  updateInstanceMetadata: (instanceId: string, metadata: { photoNumber?: string; description?: string }) => void;
  removeImage: (id: string) => Promise<void>;
  toggleImageSelection: (id: string) => void;
  toggleBulkImageSelection: (id: string) => void;
  setSelectedImages: (selectedImages: Array<{ id: string; instanceId: string }>) => void;
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
  // Session management actions
  saveSessionState: () => void;
  restoreSessionState: () => void;
  updateSessionState: (updates: Partial<SessionState>) => void;
  clearSessionState: () => void;
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
  selectedImages: [],
      bulkSelectedImages: [],
  formData: initialFormData,
  defectSortDirection: null,
  sketchSortDirection: null,
  bulkDefects: [],
  deletedDefects: [],
  viewMode: 'images',
  isLoading: false,
  isInitialized: false,
  isSortingEnabled: true,
  instanceMetadata: {},
  // Initialize session state
  sessionState: {
    lastActiveTab: 'images',
    lastActiveTime: Date.now(),
    imageOrder: [],
    selectedImageOrder: [],
    bulkDefectOrder: [],
    panelExpanded: true,
    gridWidth: 300,
    scrollPositions: {
      imageGrid: 0,
      selectedPanel: 0,
    },
    formData: initialFormData, // Include formData in session state
  },
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
            return;
          }
          
          // Get user from localStorage to avoid circular import
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Use static import - save immediately for cross-browser persistence
            await DatabaseService.updateProject(user.email, 'current', { formData: newFormData });
          }
        } catch (error) {
          console.error('Error saving form data to AWS:', error);
        }
      })();
      
      return { ...state, formData: newFormData };
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
      
      // Auto-save to AWS in background (only metadata, not full images array) - but only if not clearing
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

  updateInstanceMetadata: (instanceId, metadata) => {
    set((state) => {
      // Get existing metadata for this instance
      const existingMetadata = state.instanceMetadata[instanceId] || {};
      
      // Merge with new metadata, preserving existing values
      const updatedInstanceMetadata = {
        ...state.instanceMetadata,
        [instanceId]: {
          ...existingMetadata,  // Preserve existing photoNumber and description
          ...metadata           // Override with new values
        }
      };
      
      // Save to localStorage
      const keys = getUserSpecificKeys();
      const localStorageKey = `${keys.selections}-instance-metadata`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedInstanceMetadata));
      
      // Save to AWS for cross-device persistence
      (async () => {
        try {
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            await DatabaseService.saveInstanceMetadata(user.email, updatedInstanceMetadata);
          }
        } catch (error) {
          console.error('Error saving instance metadata to AWS:', error);
        }
      })();
      
      return {
        ...state,
        instanceMetadata: updatedInstanceMetadata
      };
    });
  },

  removeImage: async (id) => {
    try {
      set((state) => {
        const updatedImages = state.images.filter((img) => img.id !== id);
        const updatedSelected = new Set([...state.selectedImages].filter(imgId => imgId !== id));
        const updatedBulkSelected = state.bulkSelectedImages.filter(imgId => imgId !== id);
        
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
      // Create a new instance with unique instanceId using timestamp
      const timestamp = Date.now();
      const instanceId = `${id}-${timestamp}`;
      
      const newSelected = [...state.selectedImages, { id, instanceId }];
      
      console.log('🔧 toggleImageSelection - Added new instance:', { id, instanceId, timestamp });
      console.log('🔧 toggleImageSelection - New selectedImages:', newSelected);
      
      // Auto-save selections to localStorage immediately with filenames for cross-session matching (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          const selectedWithFilenames = newSelected.map(item => {
            const image = state.images.find(img => img.id === item.id);
            return {
              id: item.id,
              instanceId: item.instanceId,
              fileName: image?.fileName || image?.file?.name || 'unknown'
            };
          });
          const keys = getUserSpecificKeys();
          localStorage.setItem(keys.selections, JSON.stringify(selectedWithFilenames));
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
            // Send complete instance information to AWS
            const selectedWithInstanceIds = newSelected.map(item => {
              const image = state.images.find(img => img.id === item.id);
              return {
                id: item.id, // Keep the original image ID
                instanceId: item.instanceId, // Keep the instance ID
                fileName: image?.fileName || image?.file?.name || 'unknown'
              };
            });
            await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
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
      let newSelected = [...state.bulkSelectedImages];
      const index = newSelected.indexOf(id);
      if (index > -1) {
        newSelected.splice(index, 1);
      } else {
        newSelected.push(id);
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
          const selectedWithFilenames = selectedImages.map(item => {
            const image = state.images.find(img => img.id === item.id);
            return {
              id: item.id,
              instanceId: item.instanceId,
              fileName: image?.fileName || image?.file?.name || 'unknown'
            };
          });
          const keys = getUserSpecificKeys();
          localStorage.setItem(keys.selections, JSON.stringify(selectedWithFilenames));
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
            // Send complete instance information to AWS
            const selectedWithInstanceIds = selectedImages.map(item => {
              const image = state.images.find(img => img.id === item.id);
              return {
                id: item.id, // Keep the original image ID
                instanceId: item.instanceId, // Keep the instance ID
                fileName: image?.fileName || image?.file?.name || 'unknown'
              };
            });
            await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
            console.log('✅ Selected images auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving selected images:', error);
        }
      })();
      
      // Update session state with new selected image order
      const selectedImageOrder = selectedImages.map(item => item.instanceId);
      get().updateSessionState({ selectedImageOrder });
      
      return { selectedImages };
    });
  },

  clearSelectedImages: () => {
    set({ selectedImages: [], instanceMetadata: {} });
  },

  clearBulkSelectedImages() {
    set({ bulkSelectedImages: [] });
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
        }
      } catch (error) {
        console.error('Error saving bulk defects to localStorage:', error);
      }
      
      // Auto-save to AWS in background with rate limiting to prevent throughput issues
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            return;
          }
          
          // Rate limiting: Only save every 10 seconds to prevent DynamoDB throughput issues
          const lastBulkSaveTime = localStorage.getItem('last-bulk-aws-save');
          const now = Date.now();
          const minInterval = 10000; // 10 seconds
          
          if (lastBulkSaveTime && (now - parseInt(lastBulkSaveTime)) < minInterval) {
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Use static import
            const result = await DatabaseService.updateBulkDefects(user.email, newBulkDefects);
            if (result.success) {
              // Update the last save time only on success
              localStorage.setItem('last-bulk-aws-save', now.toString());
            }
          }
        } catch (error) {
          console.error('Error auto-saving bulk defects:', error);
        }
      })();
      
      // Update session state with new defect order
      const defectOrder = newBulkDefects.map(defect => defect.id || defect.photoNumber);
      get().updateSessionState({ bulkDefectOrder: defectOrder });
      
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
      console.log('🔄 Starting loadUserData...');
      
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
        console.log('🔄 Current user:', currentUserEmail);
        console.log('🔄 Saved user:', savedUserEmail);
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
      const [formDataResult, bulkDataResult, imagesResult, selectionsResult, instanceMetadataResult] = await Promise.allSettled([
        // Load form data from localStorage first, then AWS
        (async () => {
          try {
            const savedFormData = localStorage.getItem(userSpecificKeys.formData);
            if (savedFormData) {
              const formData = JSON.parse(savedFormData);
              return formData;
            }
          } catch (error) {
            console.warn('⚠️ Chrome localStorage read error for formData:', error);
          }
            
          if (userId !== 'anonymous') {
            try {
              const { project } = await DatabaseService.getProject(userId, 'current');
              if (project?.formData) {
                return project.formData;
              }
            } catch (awsError) {
              console.error('Error loading form data from AWS:', awsError);
            }
          }
          return null;
        })(),
        
        // Load bulk data from localStorage first, then AWS
        (async () => {
          try {
            const savedBulkData = localStorage.getItem(userSpecificKeys.bulkData);
            if (savedBulkData) {
              const bulkDefects = JSON.parse(savedBulkData);
              return bulkDefects;
            }
          } catch (error) {
            console.warn('⚠️ Chrome localStorage read error for bulkData:', error);
          }
            
          if (userId !== 'anonymous') {
            try {
              const { defects } = await DatabaseService.getBulkDefects(userId);
              if (defects && defects.length > 0) {
                return defects;
              }
            } catch (awsError) {
              console.error('Error loading bulk data from AWS:', awsError);
            }
          }
          return [];
        })(),
        
        // Load images from S3 first, then localStorage as fallback
        (async () => {
          try {
            if (userId !== 'anonymous') {
              const { files, error } = await StorageService.listFiles(`users/${userId}/images/`);
              
              if (error) {
                console.error('Error listing S3 files:', error);
              } else if (files && files.length > 0) {
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
                    return 0;
                  };
                  
                  return extractPhotoNumber(aFileName) - extractPhotoNumber(bFileName);
                });
                
                return loadedImages;
              }
            }
            
            // Fallback to localStorage if no S3 images
            const savedImages = localStorage.getItem(userSpecificKeys.images);
            if (savedImages) {
              return JSON.parse(savedImages);
            }
            
            return [];
          } catch (error) {
            console.error('Error loading images:', error);
            return [];
          }
        })(),
        
        // Load selected images from localStorage first, then AWS
        (async () => {
          try {
            const savedSelections = localStorage.getItem(userSpecificKeys.selections);
            if (savedSelections) {
              const selectedImageIds = JSON.parse(savedSelections);
              return selectedImageIds;
            }
            
            if (userId !== 'anonymous') {
              const awsSelections = await DatabaseService.getSelectedImages(userId);
              if (awsSelections && awsSelections.length > 0) {
                return awsSelections;
              }
            }
            return [];
          } catch (error) {
            console.error('Error loading selected images:', error);
            return [];
          }
        })(),
        
        // Load instance metadata from localStorage first, then AWS
        (async () => {
          try {
            const keys = getUserSpecificKeys();
            const localStorageKey = `${keys.selections}-instance-metadata`;
            
            const savedInstanceMetadata = localStorage.getItem(localStorageKey);
            
            if (savedInstanceMetadata) {
              const instanceMetadata = JSON.parse(savedInstanceMetadata);
              return instanceMetadata;
            }
            
            // Try AWS if no localStorage data
            if (userId !== 'anonymous') {
              const awsInstanceMetadata = await DatabaseService.getInstanceMetadata(userId);
              if (awsInstanceMetadata) {
                return awsInstanceMetadata;
              }
            }
            return null;
          } catch (error) {
            console.error('Error loading instance metadata:', error);
            return null;
          }
        })()
      ]);
      
      // Process results and update state
      const updates: Partial<MetadataStateOnly> = {};
      
      if (formDataResult.status === 'fulfilled' && formDataResult.value) {
        updates.formData = formDataResult.value;
      }
      
      if (bulkDataResult.status === 'fulfilled' && bulkDataResult.value) {
        updates.bulkDefects = bulkDataResult.value;
      }
      
      if (imagesResult.status === 'fulfilled' && imagesResult.value) {
        updates.images = imagesResult.value;
      }
      
      if (selectionsResult.status === 'fulfilled' && selectionsResult.value) {
        updates.selectedImages = selectionsResult.value;
      }
      
      // Add instance metadata to state updates
      if (instanceMetadataResult.status === 'fulfilled' && instanceMetadataResult.value) {
        updates.instanceMetadata = instanceMetadataResult.value;
      }
      
      // Single state update to prevent flickering
      set(updates);
      
      // Restore session state after data is loaded
      const restoredSession = get().restoreSessionState();
      
      // Mark as initialized
      set({ isLoading: false, isInitialized: true });
      
    } catch (error) {
      console.error('Error loading user data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  saveUserData: async () => {
    try {
      const state = get();
      const { formData, instanceMetadata, selectedImages } = state;
      
      // Get user-specific keys for consistent storage
      const keys = getUserSpecificKeys();
      
      // Universal storage solution with fallbacks
      const safeSetItem = (key: string, value: any) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (error) {
          console.warn(`⚠️ localStorage error for ${key}:`, error);
          
          // Fallback: Try sessionStorage
          try {
            sessionStorage.setItem(key, JSON.stringify(value));
            console.log(`✅ Saved to sessionStorage as fallback: ${key}`);
            return true;
          } catch (sessionError) {
            console.error(`❌ Both localStorage and sessionStorage failed for ${key}:`, sessionError);
            return false;
          }
        }
      };
      
      // Save form data with universal fallback
      safeSetItem(keys.formData, formData);
      
      // Save instance metadata with universal fallback
      safeSetItem(`${keys.selections}-instance-metadata`, instanceMetadata);
      
      // Save selected images with universal fallback
      safeSetItem(keys.selections, selectedImages);
      
      // Save to AWS for cross-device persistence
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        console.log('💾 Saving to AWS for user:', user.email);
        
        try {
          // Save form data to AWS
          console.log('💾 Saving form data to AWS...');
          await DatabaseService.updateProject(user.email, 'current', { formData });
          console.log('✅ Form data saved to AWS');
        } catch (error) {
          console.error('❌ Error saving form data to AWS:', error);
        }
        
        try {
          // Save instance metadata to AWS
          console.log('💾 Saving instance metadata to AWS...');
          await DatabaseService.saveInstanceMetadata(user.email, instanceMetadata);
          console.log('✅ Instance metadata saved to AWS');
        } catch (error) {
          console.error('❌ Error saving instance metadata to AWS:', error);
        }
        
        try {
          // Save selected images to AWS
          console.log('💾 Saving selected images to AWS...');
          await DatabaseService.updateSelectedImages(user.email, selectedImages);
          console.log('✅ Selected images saved to AWS');
        } catch (error) {
          console.error('❌ Error saving selected images to AWS:', error);
        }
      } else {
        console.warn('⚠️ No user email found, skipping AWS save');
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
    
    // Update session state
    get().updateSessionState({ lastActiveTab: mode });
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
      
      // Save to AWS DynamoDB for cross-device persistence (manual save bypasses rate limiting)
      if (userId !== 'anonymous') {
        // Use static import
        const result = await DatabaseService.updateBulkDefects(userId, bulkDefects);
        if (result.success) {
          console.log('✅ Manual save: Bulk defects saved to AWS for user:', userId);
          // Update the last save time to prevent immediate auto-saves
          localStorage.setItem('last-bulk-aws-save', Date.now().toString());
        } else {
          console.error('❌ Manual save failed:', result.error);
        }
      }
    } catch (error) {
      console.error('Error saving bulk data:', error);
    }
  },

  loadBulkData: async () => {
    try {
      console.log('🔄 Loading bulk data...');
      
      // Get user from localStorage to avoid dynamic imports
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      console.log('👤 Loading bulk data for user:', userId);
      
      // Create user-specific localStorage keys
      const userSpecificKeys = {
        bulkData: `clean-app-bulk-data-${userId}`
      };
      
      console.log('🔑 Using localStorage key:', userSpecificKeys.bulkData);
      
      // Try localStorage first (consistent with loadUserData)
      const savedBulkData = localStorage.getItem(userSpecificKeys.bulkData);
      if (savedBulkData) {
        try {
          const bulkDefects = JSON.parse(savedBulkData);
          console.log('📱 Found localStorage bulk data:', {
            count: bulkDefects.length,
            sample: bulkDefects[0] ? {
              id: bulkDefects[0].id,
              photoNumber: bulkDefects[0].photoNumber,
              description: bulkDefects[0].description
            } : null
          });
          
          if (bulkDefects && bulkDefects.length > 0) {
            set({ bulkDefects });
            console.log('✅ Bulk defects loaded from localStorage:', bulkDefects.length);
            return;
          }
        } catch (error) {
          console.error('❌ Error parsing localStorage bulk data:', error);
        }
      } else {
        console.log('📱 No localStorage bulk data found');
      }
      
      // Try AWS if no localStorage data
      if (userId !== 'anonymous') {
        try {
          console.log('☁️ Loading from AWS for user:', userId);
          const { defects, error } = await DatabaseService.getBulkDefects(userId);
          
          if (error) {
            console.error('❌ AWS getBulkDefects error:', error);
          } else {
            console.log('📥 AWS returned defects:', {
              count: defects.length,
              sample: defects[0] ? {
                id: defects[0].id,
                photoNumber: defects[0].photoNumber,
                description: defects[0].description
              } : null
            });
            
            if (defects && defects.length > 0) {
              set({ bulkDefects: defects });
              console.log('✅ Bulk defects loaded from AWS for user:', userId, 'Count:', defects.length);
              return;
            } else {
              console.log('📭 No defects found in AWS');
            }
          }
        } catch (error) {
          console.warn('⚠️ AWS load failed, continuing with empty state:', error);
        }
      }
      
      // Fallback to empty state
      console.log('📭 No bulk defects found, starting with empty state');
      set({ bulkDefects: [] });
    } catch (error) {
      console.error('❌ Error loading bulk data:', error);
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

  // Session management functions
  saveSessionState: () => {
    const state = get();
    const keys = getUserSpecificKeys();
    
    const sessionState = {
      lastActiveTab: state.viewMode,
      lastActiveTime: Date.now(),
      imageOrder: state.images.map(img => img.id),
      selectedImageOrder: state.selectedImages.map(item => item.instanceId),
      bulkDefectOrder: state.bulkDefects.map(defect => defect.id || defect.photoNumber),
      panelExpanded: false, // Will be updated by layout components
      gridWidth: 4, // Default, will be updated by grid components
      scrollPositions: {
        imageGrid: 0,
        selectedPanel: 0,
      },
      formData: state.formData, // Include formData in session state
    };

    try {
      localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(sessionState));
    } catch (error) {
      console.error('Error saving session state:', error);
    }
  },

  restoreSessionState: () => {
    const keys = getUserSpecificKeys();
    
    try {
      const savedSession = localStorage.getItem(`${keys.formData}-session-state`);
      if (savedSession) {
        const sessionState = JSON.parse(savedSession);
        
        // Update the session state
        set({ sessionState });
        
        // Restore view mode
        if (sessionState.lastActiveTab) {
          set({ viewMode: sessionState.lastActiveTab });
        }
        
        // Only restore formData from session state if current formData is empty
        // This prevents overwriting AWS-loaded data with localStorage data
        const currentState = get();
        if (sessionState.formData && (!currentState.formData || Object.keys(currentState.formData).length === 0)) {
          set({ formData: sessionState.formData });
        }
        
        return sessionState;
      }
    } catch (error) {
      console.error('Error restoring session state:', error);
    }
    
    return null;
  },

  updateSessionState: (updates: Partial<SessionState>) => {
    const state = get();
    const newSessionState = { ...state.sessionState, ...updates };
    set({ sessionState: newSessionState });
    
    // Auto-save session state when updated
    const keys = getUserSpecificKeys();
    try {
      localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(newSessionState));
    } catch (error) {
      console.error('Error updating session state:', error);
    }
  },

  clearSessionState: () => {
    const keys = getUserSpecificKeys();
    try {
      localStorage.removeItem(`${keys.formData}-session-state`);
    } catch (error) {
      console.error('Error clearing session state:', error);
    }
  },
}));