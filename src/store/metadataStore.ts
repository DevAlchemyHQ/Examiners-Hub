import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageService, DatabaseService } from '../lib/services';
import { ImageMetadata, FormData, BulkDefect } from '../types';
import { Operation, OperationQueue } from '../types/operations';
import { createZipFile } from '../utils/zipUtils';
import { nanoid } from 'nanoid';
import { convertImageToJpgBase64, convertBlobToBase64 } from '../utils/fileUtils';
import { useProjectStore } from './projectStore';
import { toast } from 'react-toastify';
import { 
  generateStableProjectId, 
  generateStableImageId, 
  generateStableSessionId,
  getAllProjectStorageKeys,
  saveVersionedData,
  loadVersionedData,
  PERSISTENCE_VERSION,
  type VersionedData
} from '../utils/idGenerator';
import { getBrowserId } from '../utils/browserId';
import { createOperationId } from '../types/operations';
import { applyOperation, mergeOperations } from '../utils/operationMerge';

// Helper function to get userId consistently
const getUserId = (): string => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user?.email || localStorage.getItem('userEmail') || 'anonymous';
};

// Helper function to standardize date to YYYY-MM-DD format
const standardizeDate = (dateValue: string | Date | undefined): string => {
  if (!dateValue) return '';
  
  try {
    // If already in YYYY-MM-DD format, validate and return
    if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    
    // Parse the date and convert to YYYY-MM-DD
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('❌ Error standardizing date:', dateValue, error);
    return '';
  }
};

// Helper function to generate deterministic timestamp with random offset to reduce collisions
const generateTimestamp = (data: any): number => {
  const dataHash = JSON.stringify(data).split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Add random offset (0-10) to reduce collisions while keeping the deterministic base
  const randomOffset = Math.random() * 10;
  const timestamp = Math.abs(dataHash) + 1000000000000 + randomOffset;
  
  console.log('🕐 Generated timestamp with random offset:', { dataHash, randomOffset, timestamp });
  return timestamp;
};

// Minimal Cross-Browser Sync Class
class MinimalCrossBrowserSync {
  private channel: BroadcastChannel;
  private isListening: boolean = false;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    this.channel = new BroadcastChannel('exametry-sync');
    this.setupListeners();
  }

  private setupListeners() {
    if (this.isListening) return;
    
    // Listen to BroadcastChannel messages
    this.channel.onmessage = (event) => {
      console.log('📡 Cross-tab message received:', event.data);
      const { type, data } = event.data;
      
      if (type === 'formDataUpdate') {
        console.log('🔄 Cross-tab form data update received');
        console.log('🔄 Incoming data:', data);
        const currentState = useMetadataStore.getState();
        const currentTimestamp = currentState.sessionState.lastActiveTime || 0;
        const incomingTimestamp = data.timestamp || 0;
        
        console.log('🔄 Timestamp comparison:', { currentTimestamp, incomingTimestamp });
        
        // Only update if incoming data is newer
        if (incomingTimestamp > currentTimestamp) {
          console.log('✅ Updating form data from other tab');
          
          // Merge form data to preserve existing fields
          const mergedFormData = { ...currentState.formData, ...data.formData };
          console.log('🔄 Merged form data:', { from: currentState.formData, to: mergedFormData });
          
          useMetadataStore.setState({ 
            formData: mergedFormData,
            sessionState: {
              ...currentState.sessionState,
              formData: mergedFormData,
              lastActiveTime: incomingTimestamp
            }
          });
          
          // Show toast notification
          if (typeof toast !== 'undefined') {
            toast.success('Form data synced from another tab');
          }
        } else {
          console.log('⚠️ Ignoring older form data update');
        }
      }
    };
    
    // Listen to localStorage changes for same-browser sync
    this.storageListener = (event: StorageEvent) => {
      if (event.key && event.key.includes('session-state') && event.newValue) {
        console.log('📦 Storage event detected:', event.key);
        try {
          const sessionData = JSON.parse(event.newValue);
          if (sessionData.formData) {
            console.log('🔄 Form data from storage event:', sessionData.formData);
            const currentState = useMetadataStore.getState();
            const currentTimestamp = currentState.sessionState.lastActiveTime || 0;
            const incomingTimestamp = sessionData.lastActiveTime || 0;
            
            console.log('🔄 Storage timestamp comparison:', { currentTimestamp, incomingTimestamp });
            
            // Only update if incoming data is newer
            if (incomingTimestamp > currentTimestamp) {
              console.log('✅ Updating form data from localStorage change');
              const mergedFormData = { ...currentState.formData, ...sessionData.formData };
              console.log('🔄 Merged form data from storage:', { from: currentState.formData, to: mergedFormData });
              
              useMetadataStore.setState({ 
                formData: mergedFormData,
                sessionState: {
                  ...currentState.sessionState,
                  formData: mergedFormData,
                  lastActiveTime: incomingTimestamp
                }
              });
              
              if (typeof toast !== 'undefined') {
                toast.success('Form data synced from localStorage');
              }
            }
          }
        } catch (error) {
          console.error('❌ Error parsing storage event:', error);
        }
      }
    };
    
    window.addEventListener('storage', this.storageListener);
    console.log('📡 Storage event listener added for cross-tab sync');
    
    this.isListening = true;
  }

  broadcast(type: string, data: any) {
    try {
      // Use generateTimestamp helper with random offset to reduce collisions
      const timestamp = generateTimestamp(data);
      
      const message = { type, data, timestamp };
      this.channel.postMessage(message);
      console.log('📡 Cross-tab broadcast sent:', type, 'with data:', data);
      console.log('📡 Full message with timestamp:', message);
    } catch (error) {
      console.error('❌ Error broadcasting:', error);
    }
  }

  destroy() {
    // Remove storage event listener
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
    
    this.channel.close();
    this.isListening = false;
  }
}

const minimalSync = new MinimalCrossBrowserSync();

// Deterministic image ID generation using stable IDs
const generateDeterministicImageId = (userEmail: string, projectName: string, fileName: string, uploadOrder: number): string => {
  return generateStableImageId(userEmail, projectName, fileName, uploadOrder);
};

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
  sortPreferences?: {
    defectSortDirection: 'asc' | 'desc' | null;
    sketchSortDirection: 'asc' | 'desc' | null;
  };
  lastSortChangeTime?: number; // Timestamp to prevent polling from reverting recent changes
  bulkText?: string; // Persist bulk paste text for cross-browser sync
}

// Debouncing for AWS saves to reduce costs
let awsSessionSaveTimeout: NodeJS.Timeout | null = null;
const AWS_SAVE_DEBOUNCE_MS = 15000; // 15 seconds debounce for better cost optimization

// Debouncing for instance metadata saves (prevent excessive saves during typing)
let instanceMetadataSaveTimeout: NodeJS.Timeout | null = null;
const INSTANCE_METADATA_DEBOUNCE_MS = 3000; // 3 seconds debounce for typing

// Debouncing for selected images saves to prevent DynamoDB throttling
let selectedImagesSaveTimeout: NodeJS.Timeout | null = null;
let bulkDefectsSaveTimeout: NodeJS.Timeout | null = null;
const SELECTED_IMAGES_DEBOUNCE_MS = 2000; // 2 seconds debounce for selected images
const DELETION_DEBOUNCE_MS = 500; // Short 500ms debounce for deletions (batches multiple deletions)

// We need to separate the state interface from the actions
interface MetadataStateOnly {
  images: ImageMetadata[];
  selectedImages: Array<{ id: string; instanceId: string; fileName?: string }>; // Store both base ID and instance ID
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
  // Enhanced to track when each metadata was last modified
  instanceMetadata: Record<string, { photoNumber?: string; description?: string; lastModified?: number }>;
  // Session state for comprehensive restoration
  sessionState: SessionState;
  // Operation Queue System (Phase 1: Operation-based sync)
  // Stores pending operations before they're synced to AWS
  operationQueue: Operation[];
  // Last synced version (timestamp of last operation processed)
  lastSyncedVersion: number;
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
  setSelectedImages: (selectedImages: Array<{ id: string; instanceId: string; fileName?: string }>) => void;
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
  saveSessionState: (overrideViewMode?: 'images' | 'bulk') => void;
  forceSessionStateSave: (overrideViewMode?: 'images' | 'bulk', sessionStateOverrides?: Partial<SessionState>) => Promise<void>;
  restoreSessionState: () => Promise<void>;
  updateSessionState: (updates: Partial<SessionState>) => void;
  clearSessionState: () => void;
  loadAllUserDataFromAWS: () => Promise<void>;
  saveAllUserDataToAWS: () => Promise<void>;
  smartAutoSave: (dataType?: 'form' | 'images' | 'bulk' | 'selections' | 'session' | 'all') => Promise<void>;
  startPolling: () => void;
}

// Helper function for debounced AWS session state saves
const debouncedAWSSave = async (sessionState: any) => {
  // Clear existing timeout
  if (awsSessionSaveTimeout) {
    clearTimeout(awsSessionSaveTimeout);
  }
  
  // Set new timeout for debounced save
  awsSessionSaveTimeout = setTimeout(async () => {
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        console.log('☁️ [DEBOUNCED 15s] Saving session state to AWS...');
        const { DatabaseService } = await import('../lib/services');
        await DatabaseService.updateProject(user.email, 'current', { 
          sessionState: sessionState
        });
        console.log('✅ [DEBOUNCED] Session state saved to AWS successfully');
      }
    } catch (error) {
      console.error('❌ [DEBOUNCED] Error saving session state to AWS:', error);
    }
  }, AWS_SAVE_DEBOUNCE_MS);
};

// Helper function for immediate AWS saves (for critical operations)
const forceAWSSave = async (sessionState: any, fullFormData?: any) => {
  // Clear any pending debounced save
  if (awsSessionSaveTimeout) {
    clearTimeout(awsSessionSaveTimeout);
    awsSessionSaveTimeout = null;
  }
  
  try {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    
    if (user?.email) {
      console.log('☁️ [IMMEDIATE] Forcing session state save to AWS...');
      const { DatabaseService } = await import('../lib/services');
      
      // ✅ Always send COMPLETE formData to prevent data loss
      const formDataToSave = fullFormData || sessionState.formData || {};
      
      console.log('☁️ [IMMEDIATE] Saving complete formData:', formDataToSave);
      console.log('☁️ [IMMEDIATE] SessionState being saved:', {
        bulkTextLength: sessionState.bulkText ? sessionState.bulkText.length : 0,
        bulkTextPreview: sessionState.bulkText ? sessionState.bulkText.substring(0, 100) + '...' : 'none',
        hasBulkText: !!sessionState.bulkText,
        sessionStateKeys: Object.keys(sessionState)
      });
      
      await DatabaseService.updateProject(user.email, 'current', { 
        formData: formDataToSave, // ✅ Always send complete formData
        sessionState: sessionState
      });
      console.log('✅ [IMMEDIATE] Session state forced to AWS successfully', {
        bulkTextLength: sessionState.bulkText ? sessionState.bulkText.length : 0
      });
    }
  } catch (error) {
    console.error('❌ [IMMEDIATE] Error forcing session state to AWS:', error);
  }
};

// Helper function to get deterministic project storage keys
const getProjectStorageKeys = (userEmail: string, projectName: string = 'current') => {
  return getAllProjectStorageKeys(userEmail, projectName);
};


// Migration function to handle ID mismatches between old and new formats
const migrateSelectedImageIds = (
  selectedImages: Array<{ id: string; instanceId: string; fileName?: string }>, 
  loadedImages: ImageMetadata[]
): Array<{ id: string; instanceId: string; fileName?: string }> => {
  if (!selectedImages || selectedImages.length === 0) return [];
  if (!loadedImages || loadedImages.length === 0) return [];
  
  console.log('🔄 Starting ID migration for', selectedImages.length, 'selected images');
  console.log('📊 Available loaded images:', loadedImages.map(img => ({ id: img.id, fileName: img.fileName })));
  console.log('📊 Selected images to migrate:', selectedImages);
  
  const migratedSelections: Array<{ id: string; instanceId: string; fileName?: string }> = [];
  
  selectedImages.forEach((selectedItem, index) => {
    console.log(`🔄 Processing selected item ${index + 1}:`, selectedItem);
    
    // Extract filename from the selected item - check fileName property first
    let selectedFileName = (selectedItem as any).fileName || '';
    
    console.log('📝 Extracted fileName from selected item:', selectedFileName);
    
    // If fileName property is not available, try to derive it from ID
    if (!selectedFileName) {
      if (selectedItem.id.startsWith('img-')) {
        // Extract filename from ID like 'img-PB080001-copy-JPG-1754603458580'
        const idParts = selectedItem.id.replace('img-', '').split('-');
        if (idParts.length > 1) {
          // Remove timestamp and get filename
          selectedFileName = idParts.slice(0, -1).join('-');
        } else {
          selectedFileName = idParts[0];
        }
      } else if (selectedItem.id.startsWith('s3-')) {
        selectedFileName = selectedItem.id.replace('s3-', '');
      } else if (selectedItem.id.startsWith('local-')) {
        // Handle old local- format
        const idParts = selectedItem.id.replace('local-', '').split('-');
        if (idParts.length > 1) {
          selectedFileName = idParts.slice(1).join('-');
        } else {
          selectedFileName = idParts[0];
        }
      } else {
        selectedFileName = selectedItem.id;
      }
    }
    
    console.log('✅ Final selectedFileName:', selectedFileName);
    
    // Try to find matching image by filename first (most reliable)
    const matchingImages = loadedImages.filter(img => {
      const loadedFileName = img.fileName || '';
      
      // Clean filenames for comparison
      const cleanSelected = selectedFileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const cleanLoaded = loadedFileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      console.log('🔍 Comparing:', { selected: cleanSelected, loaded: cleanLoaded, match: cleanSelected === cleanLoaded });
      
      return cleanSelected === cleanLoaded || cleanSelected.includes(cleanLoaded) || cleanLoaded.includes(cleanSelected);
    });
    
    if (matchingImages.length > 0) {
      // If we have multiple matching images (same filename), we need to be more careful
      let targetImage = matchingImages[0]; // Default to first match
      
      // If we have multiple instances of the same image, try to preserve the original mapping
      if (matchingImages.length > 1) {
        console.log(`🔍 Multiple images found for filename ${selectedFileName}:`, matchingImages.map(img => img.id));
        
        // Try to find the exact ID match first
        const exactMatch = matchingImages.find(img => img.id === selectedItem.id);
        if (exactMatch) {
          targetImage = exactMatch;
          console.log('✅ Found exact ID match:', selectedItem.id);
        } else {
          // If no exact match, use the first available image
          // This preserves the original behavior but logs the issue
          console.log('⚠️ No exact ID match found, using first available image');
        }
      }
      
      console.log('✅ Found matching image by filename:', selectedFileName, '->', targetImage.fileName, '(ID:', targetImage.id, ')');
      
      // Preserve the original instanceId if it exists, otherwise use the image ID
      const preservedInstanceId = selectedItem.instanceId || `${targetImage.id}-instance-${index}`;
      
      // Add fileName to migrated selection for future persistence
      migratedSelections.push({
        id: targetImage.id,
        instanceId: preservedInstanceId,
        fileName: targetImage.fileName // Preserve fileName for future migrations
      });
    } else {
      // Fallback: try to find by ID pattern matching
      const matchingImageById = loadedImages.find(img => {
        // Handle various ID formats
        if (selectedItem.id.startsWith('img-') && img.id.startsWith('img-')) {
          // Both use new standardized format
          const selectedFileName = selectedItem.id.replace('img-', '').split('-').slice(0, -1).join('-');
          const loadedFileName = img.id.replace('img-', '').split('-').slice(0, -1).join('-');
          return selectedFileName === loadedFileName;
        }
        return false;
      });
      
      if (matchingImageById) {
        console.log('✅ Found matching image by ID pattern:', selectedItem.id, '->', matchingImageById.id);
        migratedSelections.push({
          id: matchingImageById.id,
          instanceId: selectedItem.instanceId || `${matchingImageById.id}-instance-${index}`,
          fileName: matchingImageById.fileName // Preserve fileName for future migrations
        });
      } else {
        console.warn('⚠️ Could not migrate selected image:', selectedItem);
      }
    }
  });
  
  console.log('🔄 Migration complete. Migrated', migratedSelections.length, 'out of', selectedImages.length, 'selected images');
  console.log('📊 Migrated selections:', migratedSelections);
  return migratedSelections;
};

const initialState: MetadataStateOnly = {
  images: [],
  selectedImages: [],
      bulkSelectedImages: [],
  formData: initialFormData,
  defectSortDirection: 'asc' as 'asc' | 'desc', // Default to ascending for bulk defects
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
    gridWidth: 4,
    scrollPositions: {
      imageGrid: 0,
      selectedPanel: 0,
    },
    formData: initialFormData, // Include formData in session state
  },
  // Operation Queue System (Phase 1)
  operationQueue: [],
  lastSyncedVersion: 0,
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...initialState,

  setFormData: (data) => {
    set((state) => {
      console.log('📝 setFormData called with data:', data);
      
      // Standardize date field if present
      let processedData = { ...data };
      if (data.date !== undefined) {
        const standardizedDate = standardizeDate(data.date);
        console.log('📅 Date standardization:', { 
          original: data.date, 
          standardized: standardizedDate 
        });
        processedData.date = standardizedDate;
      }
      
      const newFormData = { ...state.formData, ...processedData };
      
      console.log('📝 Form data updated:', {
        previous: state.formData,
        new: newFormData,
        dateValue: newFormData.date,
        elrValue: newFormData.elr,
        structureNoValue: newFormData.structureNo
      });
      
      // Generate timestamp with random offset to reduce collisions
      const userId = getUserId();
      const projectId = generateStableProjectId(userId, 'current');
      const timestamp = generateTimestamp({ formData: newFormData, projectId });
      
      console.log('🕐 Generated timestamp for form data:', timestamp);
      
      const updatedSessionState = {
        ...state.sessionState,
        formData: newFormData,
        lastActiveTime: timestamp
      };
      
      // Broadcast form data changes to other tabs using minimal sync
      try {
        minimalSync.broadcast('formDataUpdate', { 
          formData: newFormData, 
          timestamp: timestamp 
        });
        console.log('📡 Form data broadcast sent via minimal sync');
      } catch (error) {
        console.error('❌ Error broadcasting form data:', error);
      }
      
      // Use forceAWSSave for immediate AWS syncing instead of smartAutoSave
      (async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping AWS save during project clear');
            return;
          }
          
          console.log('☁️ Force saving form data to AWS...');
          
          // Use forceAWSSave for immediate sync with COMPLETE formData
          await forceAWSSave(updatedSessionState, newFormData);
          
          console.log('✅ Form data force saved to AWS');
        } catch (error) {
          console.error('❌ Error in form data force save:', error);
          
          // Show toast notification for errors
          try {
            if (typeof toast !== 'undefined') {
              toast.error('Failed to sync form data to cloud. Changes saved locally.');
            }
          } catch (toastError) {
            console.warn('⚠️ Could not show error toast:', toastError);
          }
        }
      })();
      
      return { 
        ...state, 
        formData: newFormData,
        sessionState: updatedSessionState
      };
    });
  },

  addImages: async (files, isSketch = false) => {
    try {
      console.log('🚀 Starting ultra-fast parallel upload of', files.length, 'files');
      
      // Get user info once
      const userId = getUserId();
      
      // Create all image metadata immediately for instant display
      const imageMetadataArray: ImageMetadata[] = files.map((file, index) => {
        // Use deterministic ID generation for cross-browser consistency
        const deterministicId = generateStableImageId(userId, 'current', file.name, index);
        // Use REAL timestamp for proper sorting (not hash-based)
        const uploadTimestamp = Date.now() + index;
        const filePath = `users/${userId}/images/${uploadTimestamp}-${file.name}`;
        const previewUrl = URL.createObjectURL(file);
        
        console.log(`📸 Creating image metadata for ${file.name}:`, {
          id: deterministicId,
          fileName: file.name,
          previewUrl: previewUrl,
          fileSize: file.size,
          fileType: file.type,
          uploadTimestamp
        });
        
        // Create temporary metadata with local file for instant display
        return {
          id: deterministicId,
          file: file,
          fileName: file.name,
          fileSize: file.size,
          fileType: 'image/jpeg',
          photoNumber: '',
          description: '',
          preview: previewUrl, // Use local blob URL for instant display
          isSketch,
          publicUrl: '', // Will be updated after S3 upload
          userId: userId,
          uploadedAt: uploadTimestamp, // Store real upload time for sorting
          isUploading: true, // Mark as uploading
        };
      });
      
      // ADD ALL IMAGES TO STATE IMMEDIATELY for instant display
      console.log('⚡ Adding all images to state immediately for instant display');
      console.log('📊 Image metadata array:', imageMetadataArray.map(img => ({ id: img.id, fileName: img.fileName })));
      
      set((state) => {
        const combined = [...state.images, ...imageMetadataArray];
        
        console.log('🔄 Current state images count:', state.images.length);
        console.log('🔄 Combined images count:', combined.length);
        console.log('🔄 New images being added:', imageMetadataArray.length);
        
        // Sort images by photo number - extract numbers from various filename patterns
        combined.sort((a, b) => {
          const aFileName = a.fileName || a.file?.name || '';
          const bFileName = b.fileName || b.file?.name || '';
          
          // Extract photo number from various filename patterns
          const extractPhotoNumber = (filename: string) => {
            // Normalize to uppercase for pattern matching
            const normalized = filename.toUpperCase();
            
            // Pattern 1: PB08003, PB08012 (PB + 2 digits + 3 digits)
            let match = normalized.match(/PB(\d{2})(\d{3})/);
            if (match) {
              const prefix = parseInt(match[1]); // PB08 -> 08
              const sequence = parseInt(match[2]); // 003, 012
              return prefix * 1000 + sequence; // Combine for sorting: 8*1000 + 3 = 8003
            }
            
            // Pattern 2: P5110001, P3080002 (P + 3 digits + 4 digits)
            match = filename.match(/P(\d{3})(\d{4})/);
            if (match) {
              const prefix = parseInt(match[1]); // P511 -> 511, P308 -> 308
              const sequence = parseInt(match[2]); // 0001, 0002
              return prefix * 10000 + sequence; // Combine for sorting
            }
            
            // Pattern 3: Any filename with digits after PB/P
            match = filename.match(/(PB|P)(\d+)/);
            if (match) {
              return parseInt(match[2]); // Use just the number part
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
          
          // If neither has photo numbers, fall back to upload time sorting
          const aTime = (a as any).uploadedAt || parseInt(a.s3Key?.split('-')[0] || '0');
          const bTime = (b as any).uploadedAt || parseInt(b.s3Key?.split('-')[0] || '0');
          
          if (aTime && bTime) {
            return aTime - bTime; // Oldest first
          }
          
          // Final fallback to filename comparison
          return aFileName.localeCompare(bFileName);
        });
        
        // Save to localStorage
        try {
          const projectStore = useProjectStore.getState();
          if (!projectStore.isClearing) {
            const keys = getProjectStorageKeys(userId, 'current');
            localStorage.setItem(keys.images, JSON.stringify(combined));
            console.log('📱 Images saved to localStorage:', combined.length);
          }
        } catch (error) {
          console.error('❌ Error saving images to localStorage:', error);
        }
        
        console.log('✅ All images added to state immediately');
        console.log('📊 Final combined images:', combined.map(img => ({ id: img.id, fileName: img.fileName })));
        
        // Update session state with new image order
        const imageOrder = combined.map(img => img.id);
        get().updateSessionState({ imageOrder });
        
        // IMMEDIATELY save image order to AWS for cross-browser consistency
        (async () => {
          try {
            // Check if project is being cleared
            const projectStore = useProjectStore.getState();
            if (projectStore.isClearing) {
              console.log('⏸️ Skipping image order AWS save during project clear');
              return;
            }
            
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            
            if (user?.email) {
              console.log('🚀 IMMEDIATELY saving image order to AWS for cross-browser consistency');
              
              // Get current session state
              const currentState = get();
              const sessionState = currentState.sessionState;
              const formData = currentState.formData;
              
              // Force immediate AWS save (bypass debouncing) with complete formData
              await forceAWSSave(sessionState, formData);
              
              console.log('✅ Image order immediately saved to AWS for cross-browser consistency');
            } else {
              console.warn('⚠️ No user email found for immediate AWS save');
            }
          } catch (error) {
            console.error('❌ Error immediately saving image order to AWS:', error);
          }
        })();
        
        return { images: combined };
      });
      
      // Now upload to S3 in parallel (background process)
      console.log('🔄 Starting parallel S3 uploads in background...');
      const uploadPromises = files.map(async (file, index) => {
        try {
          // Use REAL timestamp for proper sorting
          const uploadTimestamp = Date.now() + index;
          const filePath = `users/${userId}/images/${uploadTimestamp}-${file.name}`;
          
          console.log(`📤 Uploading to S3: ${file.name}`);
          const uploadResult = await StorageService.uploadFile(file, filePath);
          
          if (uploadResult.error) {
            throw new Error(`Upload failed for ${file.name}: ${uploadResult.error}`);
          }
          
          console.log(`✅ S3 upload successful: ${file.name}`);
          
          // Store S3 file info in localStorage for tracking (since we can't list S3 files)
          const s3FileInfo = {
            fileName: file.name,
            s3Key: `${uploadTimestamp}-${file.name}`,
            s3Url: uploadResult.url,
            uploadTime: uploadTimestamp,
            userId: userId
          };
          
          // Get existing S3 files list and add new file
          const existingS3Files = JSON.parse(localStorage.getItem(`s3Files_${userId}`) || '[]');
          existingS3Files.push(s3FileInfo);
          localStorage.setItem(`s3Files_${userId}`, JSON.stringify(existingS3Files));
          
          // Update the image metadata with S3 URL but keep local file for downloads
          // Use the SAME ID that was created at line 607
          const consistentId = generateStableImageId(userId, 'current', file.name, index);
          
          set((state) => {
            const updatedImages = state.images.map(img => 
              img.id === consistentId 
                ? { 
                    ...img, 
                    preview: uploadResult.url!, // Use S3 URL for display
                    publicUrl: uploadResult.url!,
                    isUploading: false,
                    s3Key: `${uploadTimestamp}-${file.name}`, // Store the S3 filename for downloads
                    uploadTimestamp: uploadTimestamp, // Store for sorting
                    // Keep original file reference for immediate download
                    file: img.file // Also keep original file reference for immediate download
                  }
                : img
            );
            
            // Sort again after upload to maintain photo number order
            updatedImages.sort((a, b) => {
              const aFileName = a.fileName || a.file?.name || '';
              const bFileName = b.fileName || b.file?.name || '';
              
              const extractPhotoNumber = (filename: string) => {
                const normalized = filename.toUpperCase();
                
                let match = normalized.match(/PB(\d{2})(\d{3})/);
                if (match) {
                  const prefix = parseInt(match[1]);
                  const sequence = parseInt(match[2]);
                  return prefix * 1000 + sequence;
                }
                
                match = normalized.match(/P(\d{3})(\d{4})/);
                if (match) {
                  const prefix = parseInt(match[1]);
                  const sequence = parseInt(match[2]);
                  return prefix * 10000 + sequence;
                }
                
                match = normalized.match(/(PB|P)(\d+)/);
                if (match) {
                  return parseInt(match[2]);
                }
                
                return null;
              };
              
              const aPhotoNum = extractPhotoNumber(aFileName);
              const bPhotoNum = extractPhotoNumber(bFileName);
              
              if (aPhotoNum !== null && bPhotoNum !== null) {
                return aPhotoNum - bPhotoNum;
              }
              
              if (aPhotoNum !== null && bPhotoNum === null) {
                return -1;
              }
              if (aPhotoNum === null && bPhotoNum !== null) {
                return 1;
              }
              
              const aTime = (a as any).uploadedAt || parseInt(a.s3Key?.split('-')[0] || '0');
              const bTime = (b as any).uploadedAt || parseInt(b.s3Key?.split('-')[0] || '0');
              
              if (aTime && bTime) {
                return aTime - bTime;
              }
              
              return aFileName.localeCompare(bFileName);
            });
            
            // Save updated state
            try {
              const projectStore = useProjectStore.getState();
              if (!projectStore.isClearing) {
                const keys = getProjectStorageKeys(userId, 'current');
                localStorage.setItem(keys.images, JSON.stringify(updatedImages));
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
          const currentUserId = getUserId();
          const keys = getProjectStorageKeys(currentUserId, 'current');
          localStorage.setItem(keys.images, JSON.stringify(updatedImages));
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
      
      // Detect if description is being deleted (set to empty string)
      const isDescriptionDeletion = metadata.description === '' && existingMetadata.description && existingMetadata.description !== '';
      
      // PHASE 1: OPERATION QUEUE - Create UPDATE_METADATA operation
      const browserId = getBrowserId();
      let operationQueue = [...state.operationQueue];
      
      // Create UPDATE_METADATA operation
      const operation: Operation = {
        id: createOperationId(browserId),
        type: 'UPDATE_METADATA',
        instanceId,
        timestamp: Date.now(),
        browserId,
        data: {
          photoNumber: metadata.photoNumber !== undefined ? metadata.photoNumber : existingMetadata.photoNumber,
          description: metadata.description !== undefined ? metadata.description : existingMetadata.description,
        },
      };
      operationQueue.push(operation);
      console.log('📝 [OPERATION] Added UPDATE_METADATA operation to queue:', operation.id, { instanceId, metadata });
      
      // Merge with new metadata, preserving existing values, and add timestamp
      const now = Date.now();
      const updatedInstanceMetadata = {
        ...state.instanceMetadata,
        [instanceId]: {
          ...existingMetadata,  // Preserve existing photoNumber and description
          ...metadata,           // Override with new values
          lastModified: now      // Track when this metadata was last modified
        }
      };
      
      console.log('📝 Instance metadata updated:', { instanceId, metadata, timestamp: now, isDescriptionDeletion });
      
      // Save to localStorage using versioned format for consistency (instant local save)
      const userId = getUserId();
      const keys = getProjectStorageKeys(userId, 'current');
      const projectId = generateStableProjectId(userId, 'current');
      const localStorageKey = `${keys.selections}-instance-metadata`;
      saveVersionedData(localStorageKey, projectId, userId, updatedInstanceMetadata);
      console.log('💾 Instance metadata saved to localStorage (instant)');
      
      // Save operation queue to localStorage for persistence across refreshes
      try {
        const userId = getUserId();
        const keys = getProjectStorageKeys(userId, 'current');
        const projectId = generateStableProjectId(userId, 'current');
        saveVersionedData(`${keys.selections}-operation-queue`, projectId, userId, operationQueue);
        console.log('📱 Operation queue saved to localStorage (UPDATE_METADATA):', operationQueue.length, 'operations');
      } catch (error) {
        console.error('❌ Error saving operation queue to localStorage:', error);
      }
      
      // PHASE 1: DUAL-WRITE - Send operations AND legacy save (backward compatible)
      // Use debounced save for operations (same timing as before)
      if (isDescriptionDeletion) {
        // Clear any pending debounced save
        if (instanceMetadataSaveTimeout) {
          clearTimeout(instanceMetadataSaveTimeout);
        }
        
        // Short debounce for deletions - batches multiple description deletions but saves quickly
        instanceMetadataSaveTimeout = setTimeout(async () => {
          try {
            // Get current state (may have more operations in the batch)
            const currentState = get();
            
            // PHASE 1: Save operations to AWS
            if (currentState.operationQueue.length > 0) {
              const storedUser = localStorage.getItem('user');
              const user = storedUser ? JSON.parse(storedUser) : null;
              
              if (user?.email) {
                try {
                  console.log('📝 [OPERATION QUEUE] FAST save - sending UPDATE_METADATA operations to AWS:', currentState.operationQueue.length);
                  const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
                  
                  // Clear queue and update version on success
                  set({ 
                    operationQueue: [],
                    lastSyncedVersion: result.lastVersion 
                  });
                  
                  // Save version to localStorage
                  try {
                    const userId = getUserId();
                    const keys = getProjectStorageKeys(userId, 'current');
                    localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
                  } catch (err) {
                    console.warn('⚠️ Could not save last synced version:', err);
                  }
                  
                  console.log('✅ [OPERATION QUEUE] Operations saved (batched metadata deletions), lastVersion:', result.lastVersion);
                } catch (opError) {
                  console.error('❌ Error saving operations, keeping in queue for retry:', opError);
                  // Operations remain in queue - will retry on next save
                }
              }
            }
            
            // LEGACY: Also save via legacy method (backward compatible)
            console.log('🚨 FAST save (description deletion detected, batched) - saving instance metadata to AWS (legacy)');
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            
            if (user?.email) {
              await DatabaseService.saveInstanceMetadata(user.email, currentState.instanceMetadata);
              console.log('✅ Instance metadata saved to AWS (batched description deletions, legacy)');
            }
          } catch (error) {
            console.error('❌ Error saving instance metadata to AWS (deletion batch):', error);
          }
          instanceMetadataSaveTimeout = null;
        }, DELETION_DEBOUNCE_MS);
      } else {
      // DEBOUNCED AWS save - wait 3 seconds after user stops typing
      // Clear existing timeout
      if (instanceMetadataSaveTimeout) {
        clearTimeout(instanceMetadataSaveTimeout);
      }
      
      // Set new timeout for debounced save
      instanceMetadataSaveTimeout = setTimeout(async () => {
        try {
            // Get current state
            const currentState = get();
            
            // PHASE 1: Save operations to AWS
            if (currentState.operationQueue.length > 0) {
              const storedUser = localStorage.getItem('user');
              const user = storedUser ? JSON.parse(storedUser) : null;
              
              if (user?.email) {
                try {
                  console.log('📝 [OPERATION QUEUE] Sending UPDATE_METADATA operations to AWS:', currentState.operationQueue.length);
                  const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
                  
                  // Clear queue and update version on success
                  set({ 
                    operationQueue: [],
                    lastSyncedVersion: result.lastVersion 
                  });
                  
                  // Save version to localStorage
                  try {
                    const userId = getUserId();
                    const keys = getProjectStorageKeys(userId, 'current');
                    localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
                  } catch (err) {
                    console.warn('⚠️ Could not save last synced version:', err);
                  }
                  
                  console.log('✅ [OPERATION QUEUE] Operations saved successfully (UPDATE_METADATA), lastVersion:', result.lastVersion);
                } catch (opError) {
                  console.error('❌ Error saving operations, keeping in queue for retry:', opError);
                  // Operations remain in queue - will retry on next save
                }
              }
            }
            
            // LEGACY: Also save via legacy method (backward compatible)
            console.log('💾 Debounced save - saving instance metadata to AWS (legacy)');
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            await DatabaseService.saveInstanceMetadata(user.email, updatedInstanceMetadata);
              console.log('✅ Instance metadata saved to AWS (debounced, legacy)');
          }
        } catch (error) {
          console.error('❌ Error saving instance metadata to AWS (debounced):', error);
        }
        instanceMetadataSaveTimeout = null;
      }, INSTANCE_METADATA_DEBOUNCE_MS);
      }
      
      return {
        ...state,
        instanceMetadata: updatedInstanceMetadata,
        operationQueue, // Include updated operation queue
      };
    });
  },

  removeImage: async (id: string) => {
    try {
      set((state) => {
        const updatedImages = state.images.filter((img) => img.id !== id);
        const updatedSelected = state.selectedImages.filter(item => item.id !== id);
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
      const userId = getUserId();
      const selectionCount = state.selectedImages.length;
      const instanceId = generateStableImageId(userId, 'current', `${id}-selection-${selectionCount}`, selectionCount);
      
      // Find the image being selected to get its fileName
      const image = state.images.find(img => img.id === id);
      const fileName = image?.fileName || image?.file?.name || 'unknown';
      
      // Always add a new instance (allows selecting the same image multiple times)
      // Insert new image at correct position based on sort mode
      const newImageEntry = { id, instanceId, fileName };
      let newSelected: Array<{ id: string; instanceId: string; fileName?: string }>;
      
      console.log('🔧 toggleImageSelection - Current defectSortDirection:', state.defectSortDirection);
      
      if (state.defectSortDirection === 'asc') {
        // Ascending: new images go to END (after highest number)
        newSelected = [...state.selectedImages, newImageEntry];
        console.log('🔧 toggleImageSelection (ascending) - Added to end:', { id, instanceId, fileName });
      } else if (state.defectSortDirection === 'desc') {
        // Descending: new images go to START (before highest number)
        newSelected = [newImageEntry, ...state.selectedImages];
        console.log('🔧 toggleImageSelection (descending) - Added to start:', { id, instanceId, fileName });
      } else {
        // No sort: new images go to END (right side)
        newSelected = [...state.selectedImages, newImageEntry];
        console.log('🔧 toggleImageSelection (no sort) - Added to end:', { id, instanceId, fileName });
      }
      
      console.log('🔧 toggleImageSelection - Total selected:', newSelected.length);
      console.log('🔧 toggleImageSelection - New array order:', newSelected.map(item => item.fileName));
      
      // PHASE 1: OPERATION QUEUE - Create ADD_SELECTION operation
      const browserId = getBrowserId();
      let operationQueue = [...state.operationQueue];
      
      // Create ADD_SELECTION operation
      const operation: Operation = {
        id: createOperationId(browserId),
        type: 'ADD_SELECTION',
        instanceId,
        imageId: id,
        timestamp: Date.now(),
        browserId,
        fileName,
      };
      operationQueue.push(operation);
      console.log('📝 [OPERATION] Added ADD_SELECTION operation to queue:', operation.id);
      
      // Auto-save selections to localStorage immediately with filenames for cross-session matching (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          // Map to include fileName for each selected item
          const selectedWithFilenames = newSelected.map(item => ({
            id: item.id,
            instanceId: item.instanceId,
            fileName: item.fileName || 'unknown'
          }));
          const keys = getProjectStorageKeys(userId, 'current');
          const projectId = generateStableProjectId(userId, 'current');
          saveVersionedData(keys.selections, projectId, userId, selectedWithFilenames);
          console.log('📱 Selected images saved to localStorage (versioned):', selectedWithFilenames);
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving selected images to localStorage:', error);
      }
      
      // DEBOUNCED save to AWS to prevent DynamoDB throttling
      // Clear existing timeout
      if (selectedImagesSaveTimeout) {
        clearTimeout(selectedImagesSaveTimeout);
      }
      
      // Set new timeout for debounced save
      selectedImagesSaveTimeout = setTimeout(async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            console.log('⏸️ Skipping auto-save during project clear');
            return;
          }
          
          // Only save if we have actual selections
          if (newSelected.length === 0) {
            console.log('⏸️ No selections to save to AWS');
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            const currentState = get();
            
            // PHASE 1: DUAL-WRITE - Send operations AND full state (backward compatible)
            // Send operations first (new system)
            if (currentState.operationQueue.length > 0) {
              try {
                console.log('📝 [OPERATION QUEUE] Sending operations to AWS:', currentState.operationQueue.length);
                const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
                
                // Clear queue and update version on success
                set({ 
                  operationQueue: [],
                  lastSyncedVersion: result.lastVersion 
                });
                
                // Save version to localStorage
                try {
                  const userId = getUserId();
                  const keys = getProjectStorageKeys(userId, 'current');
                  localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
                } catch (err) {
                  console.warn('⚠️ Could not save last synced version to localStorage:', err);
                }
                
                console.log('✅ [OPERATION QUEUE] Operations saved successfully, lastVersion:', result.lastVersion);
              } catch (opError) {
                console.error('❌ Error saving operations, keeping in queue for retry:', opError);
                // Operations remain in queue - will retry on next save
              }
            }
            
            // Also send full state (legacy - for backward compatibility during migration)
            console.log('💾 Debounced save - saving selected images to AWS (legacy) for user:', user.email);
            
            // Send complete instance information to AWS
            const selectedWithInstanceIds = newSelected.map(item => {
              const image = state.images.find(img => img.id === item.id);
              return {
                id: item.id, // Keep the original image ID
                instanceId: item.instanceId, // Keep the instance ID
                fileName: image?.fileName || image?.file?.name || 'unknown'
              };
            });
            
            console.log('📦 Data being sent to AWS (legacy):', selectedWithInstanceIds);
            await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
            console.log('✅ Selected images auto-saved to AWS for user:', user.email);
          } else {
            console.warn('⚠️ No user email found for AWS auto-save');
          }
        } catch (error) {
          console.error('❌ Error auto-saving selected images to AWS:', error);
        }
        selectedImagesSaveTimeout = null;
      }, SELECTED_IMAGES_DEBOUNCE_MS);
      
      // Update session state with new selected image order
      const selectedImageOrder = newSelected.map(item => item.instanceId);
      get().updateSessionState({ selectedImageOrder });
        
      // Return state with operation queue updated
      return { 
        selectedImages: newSelected,
        operationQueue, // Include updated operation queue
      };
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
      // Detect if this is a deletion (fewer items than before)
      const isDeletion = selectedImages.length < state.selectedImages.length;
      
      // PHASE 1: OPERATION QUEUE - Create operations for changes
      const browserId = getBrowserId();
      let operationQueue = [...state.operationQueue];
      
      if (isDeletion) {
        // Find deleted items (in state but not in selectedImages)
        const currentInstanceIds = new Set(state.selectedImages.map(item => item.instanceId));
        const newInstanceIds = new Set(selectedImages.map(item => item.instanceId));
        
        const deletedInstanceIds = [...currentInstanceIds].filter(id => !newInstanceIds.has(id));
        
        // Create DELETE_SELECTION operations for each deleted item
        for (const deletedInstanceId of deletedInstanceIds) {
          const deletedItem = state.selectedImages.find(item => item.instanceId === deletedInstanceId);
          if (deletedItem) {
            const operation: Operation = {
              id: createOperationId(browserId),
              type: 'DELETE_SELECTION',
              instanceId: deletedInstanceId,
              timestamp: Date.now(),
              browserId,
            };
            operationQueue.push(operation);
            console.log('📝 [OPERATION] Added DELETE_SELECTION operation to queue:', operation.id, deletedItem.fileName);
          }
        }
      } else {
        // Could be additions - these are already handled in toggleImageSelection
        // But we need to check if there are new items here too
        const currentInstanceIds = new Set(state.selectedImages.map(item => item.instanceId));
        const newInstanceIds = new Set(selectedImages.map(item => item.instanceId));
        
        const addedInstanceIds = [...newInstanceIds].filter(id => !currentInstanceIds.has(id));
        
        // Create ADD_SELECTION operations for newly added items
        for (const addedInstanceId of addedInstanceIds) {
          const addedItem = selectedImages.find(item => item.instanceId === addedInstanceId);
          if (addedItem) {
            const operation: Operation = {
              id: createOperationId(browserId),
              type: 'ADD_SELECTION',
              instanceId: addedInstanceId,
              imageId: addedItem.id,
              timestamp: Date.now(),
              browserId,
              fileName: addedItem.fileName,
            };
            operationQueue.push(operation);
            console.log('📝 [OPERATION] Added ADD_SELECTION operation to queue (via setSelectedImages):', operation.id);
          }
        }
      }
      
      // Auto-save to localStorage immediately (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          // Use fileName from item if available, otherwise try to find it in state.images
          const selectedWithFilenames = selectedImages.map(item => {
            // If fileName is already in item, use it; otherwise try to find it
            if (item.fileName) {
              return {
                id: item.id,
                instanceId: item.instanceId,
                fileName: item.fileName
              };
            }
            const image = state.images.find(img => img.id === item.id);
            return {
              id: item.id,
              instanceId: item.instanceId,
              fileName: image?.fileName || image?.file?.name || 'unknown'
            };
          });
          const userId = getUserId();
          const keys = getProjectStorageKeys(userId, 'current');
          const projectId = generateStableProjectId(userId, 'current');
          saveVersionedData(keys.selections, projectId, userId, selectedWithFilenames);
          console.log('📱 Selected images saved to localStorage (versioned):', selectedWithFilenames);
        } else {
          console.log('⏸️ Skipping localStorage save during project clear');
        }
      } catch (error) {
        console.error('❌ Error saving selected images to localStorage:', error);
      }
      
      // CRITICAL: If deletion occurred, use SHORT debounce (500ms) to batch multiple deletions
      // while still being fast enough to prevent polling from reverting changes
      // For additions, use longer debounce (2s) to prevent DynamoDB throttling
      if (isDeletion) {
        // Clear any pending debounced save
        if (selectedImagesSaveTimeout) {
          clearTimeout(selectedImagesSaveTimeout);
        }
        
        // Short debounce for deletions - batches multiple deletions but saves quickly
        selectedImagesSaveTimeout = setTimeout(async () => {
          try {
            // Check if project is being cleared
            const projectStore = useProjectStore.getState();
            if (projectStore.isClearing) {
              console.log('⏸️ Skipping deletion save during project clear');
              return;
            }
            
            // Get current state (may have more deletions in the batch)
            const currentState = get();
            const currentSelected = currentState.selectedImages;
            
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            
            if (user?.email) {
              // PHASE 1: DUAL-WRITE - Send operations AND full state
              // Send operations first (new system)
              if (currentState.operationQueue.length > 0) {
                try {
                  console.log('📝 [OPERATION QUEUE] FAST save - sending operations to AWS:', currentState.operationQueue.length);
                  const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
                  
                  // Clear queue and update version on success
                  set({ 
                    operationQueue: [],
                    lastSyncedVersion: result.lastVersion 
                  });
                  
                  // Save version to localStorage
                  try {
                    const userId = getUserId();
                    const keys = getProjectStorageKeys(userId, 'current');
                    localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
                  } catch (err) {
                    console.warn('⚠️ Could not save last synced version to localStorage:', err);
                  }
                  
                  console.log('✅ [OPERATION QUEUE] Operations saved (batched deletions), lastVersion:', result.lastVersion);
                } catch (opError) {
                  console.error('❌ Error saving operations, keeping in queue for retry:', opError);
                  // Operations remain in queue - will retry on next save
                }
              }
              
              // Also send full state (legacy - for backward compatibility)
              console.log('🚨 FAST save (deletion detected, batched) - saving selected images to AWS for user:', user.email);
              // Send complete instance information to AWS (use current state to catch batched deletions)
              const selectedWithInstanceIds = currentSelected.map(item => {
                const image = currentState.images.find(img => img.id === item.id);
                return {
                  id: item.id, // Keep the original image ID
                  instanceId: item.instanceId, // Keep the instance ID
                  fileName: image?.fileName || image?.file?.name || 'unknown'
                };
              });
              await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
              console.log('✅ Selected images saved to AWS (batched deletions):', selectedWithInstanceIds.length);
            }
          } catch (error) {
            console.error('❌ Error saving selected images to AWS (deletion batch):', error);
          }
          selectedImagesSaveTimeout = null;
        }, DELETION_DEBOUNCE_MS);
      } else {
        // DEBOUNCED save for additions/changes to prevent DynamoDB throttling
        // Clear existing timeout
        if (selectedImagesSaveTimeout) {
          clearTimeout(selectedImagesSaveTimeout);
        }
        
        // Set new timeout for debounced save
        selectedImagesSaveTimeout = setTimeout(async () => {
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
              console.log('💾 Debounced save - saving selected images to AWS for user:', user.email);
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
            console.error('❌ Error auto-saving selected images to AWS:', error);
        }
          selectedImagesSaveTimeout = null;
        }, SELECTED_IMAGES_DEBOUNCE_MS);
      }
      
      // Update session state with new selected image order
      const selectedImageOrder = selectedImages.map(item => item.instanceId);
      get().updateSessionState({ selectedImageOrder });
      
      // Save operation queue to localStorage for persistence across refreshes
      try {
        const userId = getUserId();
        const keys = getProjectStorageKeys(userId, 'current');
        const projectId = generateStableProjectId(userId, 'current');
        saveVersionedData(`${keys.selections}-operation-queue`, projectId, userId, operationQueue);
        console.log('📱 Operation queue saved to localStorage:', operationQueue.length, 'operations');
      } catch (error) {
        console.error('❌ Error saving operation queue to localStorage:', error);
      }
      
      return { 
        selectedImages,
        operationQueue, // Include updated operation queue
      };
    });
  },

  clearSelectedImages: () => {
    set({ selectedImages: [], instanceMetadata: {} });
  },

  clearBulkSelectedImages() {
    set({ bulkSelectedImages: [] });
  },

  setDefectSortDirection: (direction) => {
    set((state) => {
      // For bulk defects, always enforce 'asc' - ignore any other direction
      // This ensures bulk defects are always sorted ascending and persist this preference
      const effectiveDirection: 'asc' = 'asc';
      
      // PHASE 1: OPERATION QUEUE - Create SORT_CHANGE operation
      const browserId = getBrowserId();
      let operationQueue = [...state.operationQueue];
      
      // Create SORT_CHANGE operation (always 'asc' for bulk defects)
      const operation: Operation = {
        id: createOperationId(browserId),
        type: 'SORT_CHANGE',
        timestamp: Date.now(),
        browserId,
        data: {
          sortDirection: effectiveDirection,
        },
      };
      operationQueue.push(operation);
      console.log('📝 [OPERATION] Added SORT_CHANGE operation to queue:', operation.id, { direction: effectiveDirection, note: 'Bulk defects always use ascending sort' });
      
      // Save operation queue to localStorage
      try {
        const userId = getUserId();
        const keys = getProjectStorageKeys(userId, 'current');
        const projectId = generateStableProjectId(userId, 'current');
        saveVersionedData(`${keys.selections}-operation-queue`, projectId, userId, operationQueue);
        console.log('📱 Operation queue saved to localStorage (SORT_CHANGE):', operationQueue.length, 'operations');
      } catch (error) {
        console.error('❌ Error saving operation queue to localStorage:', error);
      }
      
      // Update state - always 'asc' for bulk defects
      return {
        defectSortDirection: effectiveDirection,
        operationQueue,
      };
    });
    
    // Save sort preferences to session state and AWS - always 'asc' for bulk defects
    setTimeout(async () => {
      const state = get();
      get().updateSessionState({
        sortPreferences: {
          defectSortDirection: 'asc', // Always 'asc' for bulk defects
          sketchSortDirection: state.sketchSortDirection
        },
        // Update selectedImageOrder to current state (images stay as-is, just sort them visually)
        selectedImageOrder: state.selectedImages.map(item => item.instanceId),
        // Record timestamp (for future use if polling re-enabled)
        lastSortChangeTime: Date.now()
      });
      
      // PHASE 1: DUAL-WRITE - Send operations AND legacy save
      const { DatabaseService } = await import('../lib/services');
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        const currentState = get();
        
        // PHASE 1: Save operations to AWS (immediate - sort changes should sync fast)
        if (currentState.operationQueue.length > 0) {
          try {
            console.log('📝 [OPERATION QUEUE] Immediately saving SORT_CHANGE operation to AWS');
            const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
            
            // Clear queue and update version on success
            set({ 
              operationQueue: [],
              lastSyncedVersion: result.lastVersion 
            });
            
            // Save version to localStorage
            try {
              const userId = getUserId();
              const keys = getProjectStorageKeys(userId, 'current');
              localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
            } catch (err) {
              console.warn('⚠️ Could not save last synced version:', err);
            }
            
            console.log('✅ [OPERATION QUEUE] SORT_CHANGE operation saved, lastVersion:', result.lastVersion);
          } catch (opError) {
            console.error('❌ Error saving operations, keeping in queue for retry:', opError);
            // Operations remain in queue - will retry on next save
          }
        }
        
        // LEGACY: Also save via legacy method (backward compatible)
        try {
          console.log('💾 Immediately saving sort preferences to AWS for cross-browser sync (legacy)');
          await DatabaseService.updateProject(user.email, 'current', {
            sortPreferences: {
              defectSortDirection: direction,
              sketchSortDirection: currentState.sketchSortDirection
            }
          });
          console.log('✅ Sort preferences immediately saved to AWS (legacy)');
        } catch (error) {
          console.error('❌ Error immediately saving sort preferences to AWS:', error);
        }
      }
    }, 100);
  },

  setSketchSortDirection: (direction) => {
    set((state) => {
      // PHASE 1: OPERATION QUEUE - Create SORT_CHANGE operation
      const browserId = getBrowserId();
      let operationQueue = [...state.operationQueue];
      
      // Create SORT_CHANGE operation (note: sketch sort doesn't affect selected images, but we track it)
      const operation: Operation = {
        id: createOperationId(browserId),
        type: 'SORT_CHANGE',
        timestamp: Date.now(),
        browserId,
        data: {
          sortDirection: direction,
        },
      };
      operationQueue.push(operation);
      console.log('📝 [OPERATION] Added SORT_CHANGE operation to queue (sketch):', operation.id, { direction });
      
      // Save operation queue to localStorage
      try {
        const userId = getUserId();
        const keys = getProjectStorageKeys(userId, 'current');
        const projectId = generateStableProjectId(userId, 'current');
        saveVersionedData(`${keys.selections}-operation-queue`, projectId, userId, operationQueue);
        console.log('📱 Operation queue saved to localStorage (SORT_CHANGE sketch):', operationQueue.length, 'operations');
      } catch (error) {
        console.error('❌ Error saving operation queue to localStorage:', error);
      }
      
      // Update state
      return {
        sketchSortDirection: direction,
        operationQueue,
      };
    });
    
    // Save sort preferences to session state and AWS
    setTimeout(async () => {
      const state = get();
      get().updateSessionState({
        sortPreferences: {
          defectSortDirection: state.defectSortDirection,
          sketchSortDirection: direction
        },
        // Update selectedImageOrder to current state (images stay as-is, just sort them visually)
        selectedImageOrder: state.selectedImages.map(item => item.instanceId),
        // Record timestamp (for future use if polling re-enabled)
        lastSortChangeTime: Date.now()
      });
      
      // PHASE 1: DUAL-WRITE - Send operations AND legacy save
      const { DatabaseService } = await import('../lib/services');
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        const currentState = get();
        
        // PHASE 1: Save operations to AWS (immediate - sort changes should sync fast)
        if (currentState.operationQueue.length > 0) {
          try {
            console.log('📝 [OPERATION QUEUE] Immediately saving SORT_CHANGE operation to AWS (sketch)');
            const result = await DatabaseService.saveOperations(user.email, currentState.operationQueue);
            
            // Clear queue and update version on success
            set({ 
              operationQueue: [],
              lastSyncedVersion: result.lastVersion 
            });
            
            // Save version to localStorage
            try {
              const userId = getUserId();
              const keys = getProjectStorageKeys(userId, 'current');
              localStorage.setItem(`${keys.selections}-last-synced-version`, result.lastVersion.toString());
            } catch (err) {
              console.warn('⚠️ Could not save last synced version:', err);
            }
            
            console.log('✅ [OPERATION QUEUE] SORT_CHANGE operation saved (sketch), lastVersion:', result.lastVersion);
          } catch (opError) {
            console.error('❌ Error saving operations, keeping in queue for retry:', opError);
            // Operations remain in queue - will retry on next save
          }
        }
        
        // LEGACY: Also save via legacy method (backward compatible)
        try {
          console.log('💾 Immediately saving sort preferences to AWS for cross-browser sync (legacy)');
          await DatabaseService.updateProject(user.email, 'current', {
            sortPreferences: {
              defectSortDirection: currentState.defectSortDirection,
          sketchSortDirection: direction
        }
      });
          console.log('✅ Sort preferences immediately saved to AWS (legacy)');
        } catch (error) {
          console.error('❌ Error immediately saving sort preferences to AWS:', error);
        }
      }
    }, 100);
  },

  setBulkDefects: (defects) => {
    set((state) => {
      const newBulkDefects = typeof defects === 'function' ? defects(state.bulkDefects) : defects;
      
      // Auto-save to localStorage immediately (but not during clearing)
      try {
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (!projectStore.isClearing) {
          const userId = getUserId();
          const keys = getProjectStorageKeys(userId, 'current');
          localStorage.setItem(keys.bulkData, JSON.stringify(newBulkDefects));
        }
      } catch (error) {
        console.error('Error saving bulk defects to localStorage:', error);
      }
      
      // Auto-save to AWS with debouncing to prevent race conditions
      // Clear existing timeout
      if (bulkDefectsSaveTimeout) {
        clearTimeout(bulkDefectsSaveTimeout);
      }
      
      // Set new timeout for debounced save
      bulkDefectsSaveTimeout = setTimeout(async () => {
        try {
          // Check if project is being cleared
          const projectStore = useProjectStore.getState();
          if (projectStore.isClearing) {
            return;
          }
          
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            // Get the latest state in case it changed during debounce
            const latestState = get();
            const latestDefects = latestState.bulkDefects;
            
            console.log('🔄 Debounced auto-save triggered for bulk defects:', latestDefects.length);
            const result = await DatabaseService.updateBulkDefects(user.email, latestDefects);
            if (result.success) {
              console.log('✅ Bulk defects saved to AWS for user:', user.email);
            } else {
              console.error('❌ Failed to save bulk defects to AWS:', result.error);
            }
          }
        } catch (error) {
          console.error('Error auto-saving bulk defects:', error);
        }
        bulkDefectsSaveTimeout = null;
      }, 2000); // 2 second debounce - same as selected images
      
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
          const userId = getUserId();
          const keys = getProjectStorageKeys(userId, 'current');
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
    
    // Clear user-specific viewMode keys and S3 file tracking
    try {
      const userId = getUserId();
      const keys = getProjectStorageKeys(userId, 'current');
      localStorage.removeItem(`${keys.formData}-viewMode`);
      localStorage.removeItem(`s3Files_${userId}`);
      console.log('🗑️ Cleared viewMode and S3 tracking from localStorage');
    } catch (error) {
      console.error('Error removing user-specific keys:', error);
    }
    
    console.log('✅ Metadata store reset completed');
  },

  getSelectedCounts: () => {
    const state = get();
    const selectedImagesList = state.images.filter(img => state.selectedImages.some(selected => selected.id === img.id));
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
      
      // PHASE 1: Load operation queue from localStorage on initial load
      const keys = getProjectStorageKeys(userId, 'current');
      const projectId = generateStableProjectId(userId, 'current');
      
      try {
        const savedQueue = loadVersionedData(`${keys.selections}-operation-queue`);
        const lastSyncedVersion = localStorage.getItem(`${keys.selections}-last-synced-version`);
        
        if (savedQueue && Array.isArray(savedQueue) && savedQueue.length > 0) {
          console.log('📥 [LOAD] Restoring operation queue from localStorage:', savedQueue.length, 'operations');
          set({ 
            operationQueue: savedQueue,
            lastSyncedVersion: lastSyncedVersion ? parseInt(lastSyncedVersion, 10) : 0 
          });
        } else {
          console.log('📥 [LOAD] No saved operation queue found');
        }
      } catch (error) {
        console.warn('⚠️ Error loading operation queue from localStorage:', error);
      }
      
      // Create deterministic project storage keys for consistent cross-browser access
      const projectKeys = getProjectStorageKeys(userId, 'current');
      
      console.log('Loading data for user:', userId, 'project:', projectId);
      
      // Load all data in parallel and batch state updates
      const [formDataResult, bulkDataResult, imagesResult, selectionsResult, instanceMetadataResult] = await Promise.allSettled([
        // Load form data from localStorage ONLY (for instant display)
        // AWS sync happens in background via loadAllUserDataFromAWS
        (async () => {
          try {
            const formData = loadVersionedData(projectKeys.formData);
            if (formData) {
              console.log('📋 Form data loaded from localStorage (instant display):', formData);
              return formData;
            } else {
              console.log('⚠️ No form data in localStorage');
            }
          } catch (error) {
            console.warn('⚠️ localStorage read error for formData:', error);
          }
          
          console.log('⚠️ No form data available from localStorage');
          return null;
        })(),
        
        // Load bulk data from localStorage first, then AWS
        (async () => {
          try {
            const bulkData = loadVersionedData(projectKeys.bulkData);
            if (bulkData) {
              console.log('📋 Bulk data loaded from localStorage:', bulkData);
              return bulkData;
            }
          } catch (error) {
            console.warn('⚠️ localStorage read error for bulkData:', error);
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
            // Try to load S3 files from localStorage tracking (since we can't list S3 directly)
            if (userId !== 'anonymous') {
              try {
                console.log('🔄 Attempting to load S3 files from localStorage tracking...');
                
                // Check if project is being cleared - don't load data during clearing
                const projectStore = useProjectStore.getState();
                if (projectStore.isClearing) {
                  console.log('⏸️ Skipping S3 files load - project is being cleared');
                  return [];
                }
                
                // Check if project was recently cleared (within last 30 seconds)
                if (projectStore.clearCompletedAt && (Date.now() - projectStore.clearCompletedAt) < 30000) {
                  console.log('⏸️ Skipping S3 files load - project was recently cleared');
                  return [];
                }
                
                const s3FilesList = JSON.parse(localStorage.getItem(`s3Files_${userId}`) || '[]');
                
                if (s3FilesList && s3FilesList.length > 0) {
                  console.log(`📁 Found ${s3FilesList.length} S3 files in localStorage tracking`);
                  
                  const loadedImages: ImageMetadata[] = [];
                  
                  s3FilesList.forEach((s3File, index) => {
                    try {
                      const originalFileName = s3File.fileName;
                      const timestamp = s3File.uploadTime;
                      
                      // Generate consistent ID based on filename to maintain selections
                      const consistentId = generateDeterministicImageId(userId, 'current', originalFileName, index);
                      
                      console.log(`🔄 Processing S3 file from tracking: ${originalFileName}`);
                      console.log(`🔄 S3 URL: ${s3File.s3Url}`);
                      
                      const imageMetadata: ImageMetadata = {
                        id: consistentId,
                        fileName: originalFileName,
                        fileSize: 0, // We don't store size in tracking
                        fileType: 'image/jpeg',
                        photoNumber: '',
                        description: '',
                        preview: s3File.s3Url, // Use S3 URL directly
                        isSketch: false,
                        publicUrl: s3File.s3Url,
                        userId: userId,
                        s3Key: s3File.s3Key,
                      };
                      
                      loadedImages.push(imageMetadata);
                    } catch (error) {
                      console.error('Error processing S3 file from tracking:', s3File.fileName, error);
                    }
                  });
                  
                  // Sort images by upload time
                  loadedImages.sort((a, b) => {
                    const aTime = parseInt(a.s3Key?.split('-')[0] || '0');
                    const bTime = parseInt(b.s3Key?.split('-')[0] || '0');
                    return aTime - bTime;
                  });
                  
                  console.log('✅ S3 images loaded from tracking:', loadedImages.length);
                  return loadedImages;
                } else {
                  console.log('📁 No S3 files found in localStorage tracking');
                }
              } catch (s3Error) {
                console.warn('⚠️ S3 file tracking failed, falling back to localStorage:', s3Error);
              }
            }
            
            // Fallback to localStorage if no S3 files or S3 fails
            const savedImages = loadVersionedData(projectKeys.images);
            if (savedImages) {
              return savedImages;
            }
            
            return [];
          } catch (s3Error) {
            console.warn('⚠️ S3 operation failed, using localStorage fallback:', s3Error);
            // Fallback to localStorage
            const savedImages = loadVersionedData(projectKeys.images);
            if (savedImages) {
              return savedImages;
            }
            return [];
          }
        })(),
        
        // Load selected images from localStorage first, then AWS
        (async () => {
          try {
            // Use loadVersionedData to properly extract .data from versioned objects
            const savedSelections = loadVersionedData(projectKeys.selections);
            console.log('🔍 DEBUG: savedSelections from loadVersionedData:', savedSelections);
            console.log('🔍 DEBUG: savedSelections type:', typeof savedSelections);
            console.log('🔍 DEBUG: savedSelections isArray:', Array.isArray(savedSelections));
            
            // CRITICAL FIX: Check for non-empty array, not just truthy value
            // Empty array [] is truthy but has length 0, so we should try AWS
            if (savedSelections && Array.isArray(savedSelections) && savedSelections.length > 0) {
              console.log('🔍 DEBUG: savedSelections has data, length:', savedSelections.length);
              return savedSelections;
            }
            
            console.log('⚠️ No savedSelections found or empty array in localStorage, trying AWS...');
            if (userId !== 'anonymous') {
              const awsSelections = await DatabaseService.getSelectedImages(userId);
              console.log('🔍 DEBUG: awsSelections from AWS:', awsSelections);
              if (awsSelections && awsSelections.length > 0) {
                console.log('✅ Loaded selected images from AWS:', awsSelections.length);
                return awsSelections;
              }
            }
            console.log('⚠️ No selected images found in AWS either');
            return [];
          } catch (error) {
            console.error('Error loading selected images:', error);
            return [];
          }
        })(),
        
        // Load instance metadata from localStorage first, then AWS
        (async () => {
          try {
            const keys = getProjectStorageKeys(userId, 'current');
            const localStorageKey = `${keys.selections}-instance-metadata`;
            
            // Use versioned data format for consistency
            const savedInstanceMetadata = loadVersionedData(localStorageKey);
            
            // CRITICAL FIX: Check for non-empty object (instance metadata is an object, not array)
            // Empty object {} is truthy but has no data, so we should try AWS
            if (savedInstanceMetadata && typeof savedInstanceMetadata === 'object' && Object.keys(savedInstanceMetadata).length > 0) {
              console.log('📋 Instance metadata loaded from localStorage');
              return savedInstanceMetadata;
            }
            
            // Try AWS if no localStorage data or empty object
            if (userId !== 'anonymous') {
              const awsInstanceMetadata = await DatabaseService.getInstanceMetadata(userId);
              if (awsInstanceMetadata && Object.keys(awsInstanceMetadata).length > 0) {
                console.log('📋 Instance metadata loaded from AWS');
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
        console.log('✅ Form data loaded from storage:', formDataResult.value);
      } else {
        console.log('⚠️ Form data not loaded:', formDataResult.status, formDataResult.reason);
      }
      
      if (bulkDataResult.status === 'fulfilled' && bulkDataResult.value) {
        updates.bulkDefects = bulkDataResult.value;
      }
      
      if (imagesResult.status === 'fulfilled' && imagesResult.value) {
        console.log('✅ Setting images in state:', imagesResult.value.length);
        console.log('✅ First image:', imagesResult.value[0]);
        updates.images = imagesResult.value;
      } else {
        console.log('❌ No images loaded or failed:', imagesResult.status, imagesResult.reason);
        updates.images = [];
      }
      
      // Handle selected images loading with fallback logic
      if (selectionsResult.status === 'fulfilled' && selectionsResult.value) {
        console.log('📥 Loaded selectedImages from storage:', selectionsResult.value);
        console.log('📥 SelectedImages value type:', typeof selectionsResult.value);
        console.log('📥 SelectedImages is array:', Array.isArray(selectionsResult.value));
        console.log('📥 SelectedImages length:', selectionsResult.value.length);
        
        // If we have loaded images, try to migrate the selections
        if (imagesResult.status === 'fulfilled' && imagesResult.value && imagesResult.value.length > 0) {
          const migratedSelections = migrateSelectedImageIds(selectionsResult.value, imagesResult.value || []);
          const migrationRate = selectionsResult.value.length > 0 ? (migratedSelections.length / selectionsResult.value.length) : 1;
          
          // If migration success rate is too low (< 50%), the selections likely reference old files
          // Clear them to prevent stale selections from appearing
          if (migrationRate < 0.5 && selectionsResult.value.length > 0) {
            console.log('⚠️ Low migration success rate (' + Math.round(migrationRate * 100) + '%) - clearing stale selections that reference old files');
            updates.selectedImages = [];
            // Clear localStorage to remove stale selections
            const keys = getProjectStorageKeys(userId, 'current');
            saveVersionedData(keys.selections, projectId, userId, []);
          } else if (migratedSelections.length > 0) {
            updates.selectedImages = migratedSelections;
            console.log('✅ Migrated selections applied:', migratedSelections.length, '(' + Math.round(migrationRate * 100) + '% success rate)');
          } else {
            console.log('⚠️ Migration returned empty array');
            // Even if migration failed, try to use the original data if images haven't loaded yet
            // This handles the case where images load asynchronously after selections
            if (selectionsResult.value.length > 0) {
              console.log('🔄 Attempting to preserve original selections temporarily');
              updates.selectedImages = selectionsResult.value as any;
            }
          }
        } else {
          console.log('⚠️ Images not loaded yet, preserving original selections');
          if (selectionsResult.value.length > 0) {
            updates.selectedImages = selectionsResult.value as any;
          }
        }
      } else {
        console.log('⚠️ No selectedImages found in storage or failed to load');
      }
      
      // Add instance metadata to state updates
      if (instanceMetadataResult.status === 'fulfilled' && instanceMetadataResult.value) {
        updates.instanceMetadata = instanceMetadataResult.value;
      }
      
      // Single state update to prevent flickering
      set(updates);
      
      // Restore session state after data is loaded
      await get().restoreSessionState();
      
      // Load bulk data with session state restoration
      await get().loadBulkData();
      
      // Mark as initialized
      set({ isLoading: false, isInitialized: true });
      
    } catch (error) {
      console.error('Error loading user data:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  saveUserData: async () => {
    try {
      console.log('🔄 saveUserData called - starting save process...');
      
      const userId = getUserId();
      const state = get();
      const { formData, instanceMetadata, selectedImages } = state;
      
      console.log('📊 Current state to save:', {
        formData,
        instanceMetadata,
        selectedImagesCount: selectedImages.length
      });
      
      // Get user-specific keys for consistent storage
      const keys = getProjectStorageKeys(userId, 'current');
      
      // Simple localStorage save with error handling
      try {
        localStorage.setItem(keys.formData, JSON.stringify(formData));
        localStorage.setItem(`${keys.selections}-instance-metadata`, JSON.stringify(instanceMetadata));
        localStorage.setItem(keys.selections, JSON.stringify(selectedImages));
        console.log('✅ localStorage save completed');
      } catch (error) {
        console.warn('⚠️ localStorage save error:', error);
      }
      
      // Save to AWS for cross-device persistence
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      
      if (user?.email) {
        console.log('💾 Saving to AWS for user:', user.email);
        
        try {
          // Save form data and session state to AWS
          console.log('💾 Saving form data and session state to AWS...');
          await DatabaseService.updateProject(user.email, 'current', { 
            formData,
            sessionState: state.sessionState,
            sortPreferences: {
              defectSortDirection: state.defectSortDirection,
              sketchSortDirection: state.sketchSortDirection
            }
          });
          console.log('✅ Form data and session state saved to AWS');
        } catch (error) {
          console.error('❌ Error saving form data and session state to AWS:', error);
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
    const userId = getUserId();
    const keys = getProjectStorageKeys(userId, 'current');
    localStorage.setItem(`${keys.formData}-viewMode`, mode);
    console.log('💾 ViewMode saved to localStorage:', mode);
    
    // Update session state (preserve selectedImageOrder)
    const state = get();
    get().updateSessionState({ 
      lastActiveTab: mode,
      selectedImageOrder: state.sessionState?.selectedImageOrder || state.selectedImages.map(item => item.instanceId)
    });
    
    // Use smart auto-save for cross-browser persistence when switching tabs
    (async () => {
      try {
        await get().smartAutoSave('session');
        console.log('✅ Tab switch data saved to AWS for cross-browser persistence');
      } catch (error) {
        console.error('❌ Error saving tab switch data to AWS:', error);
      }
    })();
  },

  saveBulkData: async () => {
    try {
      const state = get();
      const { bulkDefects } = state;
      
      // Get user for user-specific keys
      const userId = getUserId();
      
      // Save to user-specific localStorage
      const keys = getProjectStorageKeys(userId, 'current');
      localStorage.setItem(keys.bulkData, JSON.stringify(bulkDefects));
      
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
      const userId = getUserId();
      
      console.log('👤 Loading bulk data for user:', userId);
      
      // Create user-specific localStorage keys
      const userSpecificKeys = getProjectStorageKeys(userId, 'current');
      
      console.log('🔑 Using localStorage key:', userSpecificKeys.bulkData);
      
      // Get current state to check if bulk defects are already loaded
      const currentState = get();
      const sessionState = currentState.sessionState;
      
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
            // Restore order from session state if available
            if (sessionState.bulkDefectOrder && sessionState.bulkDefectOrder.length > 0) {
              console.log('🔄 Restoring bulk defect order from session state:', sessionState.bulkDefectOrder);
              
              // Create a map for quick lookup
              const defectMap = new Map<string, BulkDefect>(bulkDefects.map(defect => [defect.id || defect.photoNumber, defect]));
              
              // Reorder defects according to saved order
              const reorderedDefects = sessionState.bulkDefectOrder
                .map(id => defectMap.get(id))
                .filter(Boolean) as BulkDefect[];
              
              // Add any defects not in the saved order at the end
              const remainingDefects = bulkDefects.filter(defect => 
                !sessionState.bulkDefectOrder.includes(defect.id || defect.photoNumber)
              );
              
              const finalDefects = [...reorderedDefects, ...remainingDefects];
              set({ bulkDefects: finalDefects });
              console.log('✅ Bulk defects loaded and reordered from localStorage:', finalDefects.length);
            } else {
              set({ bulkDefects });
              console.log('✅ Bulk defects loaded from localStorage (no order restoration):', bulkDefects.length);
            }
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
              // Restore order from session state if available
              if (sessionState.bulkDefectOrder && sessionState.bulkDefectOrder.length > 0) {
                console.log('🔄 Restoring bulk defect order from session state:', sessionState.bulkDefectOrder);
                
                // Create a map for quick lookup
                const defectMap = new Map<string, BulkDefect>(defects.map(defect => [defect.id || defect.photoNumber, defect]));
                
                // Reorder defects according to saved order
                const reorderedDefects = sessionState.bulkDefectOrder
                  .map(id => defectMap.get(id))
                  .filter(Boolean) as BulkDefect[];
                
                // Add any defects not in the saved order at the end
                const remainingDefects = defects.filter(defect => 
                  !sessionState.bulkDefectOrder.includes(defect.id || defect.photoNumber)
                );
                
                const finalDefects = [...reorderedDefects, ...remainingDefects];
                set({ bulkDefects: finalDefects });
                console.log('✅ Bulk defects loaded and reordered from AWS:', finalDefects.length);
                
                // Cache to localStorage for faster future access
                localStorage.setItem(userSpecificKeys.bulkData, JSON.stringify(finalDefects));
                console.log('💾 Cached bulk defects to localStorage');
              } else {
                set({ bulkDefects: defects });
                console.log('✅ Bulk defects loaded from AWS (no order restoration):', defects.length);
                
                // Cache to localStorage for faster future access
                localStorage.setItem(userSpecificKeys.bulkData, JSON.stringify(defects));
                console.log('💾 Cached bulk defects to localStorage');
              }
              return;
            }
          }
        } catch (error) {
          console.error('❌ Error loading bulk data from AWS:', error);
        }
      }
      
      // If we get here, no data was found
      console.log('⚠️ No bulk data found from any source');
      set({ bulkDefects: [] });
    } catch (error) {
      console.error('Error loading bulk data:', error);
      set({ bulkDefects: [] });
    }
  },

  // NEW FUNCTION: Load all user data from AWS for cross-browser persistence
  loadAllUserDataFromAWS: async () => {
    try {
      console.log('🌐 loadAllUserDataFromAWS: Starting AWS data load...');
      
      const userId = getUserId();
      const projectId = generateStableProjectId(userId, 'current');
      
      if (userId === 'anonymous') {
        console.log('⚠️ No authenticated user, skipping AWS load');
        return;
      }
      
      console.log('👤 Loading AWS data for user:', userId);
      
      // Load all data from AWS in parallel
      const [projectResult, bulkDefectsResult, selectedImagesResult, instanceMetadataResult, s3FilesResult] = await Promise.allSettled([
        // Load project data (form data + session state)
        DatabaseService.getProject(userId, 'current'),
        // Load bulk defects
        DatabaseService.getBulkDefects(userId),
        // Load selected images
        DatabaseService.getSelectedImages(userId),
        // Load instance metadata
        DatabaseService.getInstanceMetadata(userId),
        // Load S3 files for images
        StorageService.listFiles(`users/${userId}/images/`)
      ]);
      
      // Process project data (form data + session state)
      if (projectResult.status === 'fulfilled' && projectResult.value.project) {
        const project = projectResult.value.project;
        console.log('📋 Project data loaded from AWS:', {
          hasFormData: !!project.formData,
          hasSessionState: !!project.sessionState,
          hasSortPreferences: !!project.sortPreferences
        });
        
        // Update form data if available (only if it's newer than current state)
        if (project.formData) {
          const currentState = get();
          const currentSessionState = currentState.sessionState;
          const awsLastActiveTime = project.sessionState?.lastActiveTime || 0;
          const localLastActiveTime = currentSessionState?.lastActiveTime || 0;
          
          console.log('🔄 AWS vs Local timestamp check:', {
            aws: awsLastActiveTime,
            local: localLastActiveTime,
            awsIsNewer: awsLastActiveTime > localLastActiveTime
          });
          
          // For cross-browser sync: Use AWS data if it's different from local
          // Load local data first to compare
          let localFormData = null;
          try {
            const keys = getProjectStorageKeys(userId, 'current');
            localFormData = loadVersionedData(keys.formData);
          } catch (error) {
            console.warn('⚠️ Could not load local formData:', error);
          }
          
          const localDataStr = JSON.stringify(localFormData || {});
          const awsDataStr = JSON.stringify(project.formData);
          const dataIsDifferent = localDataStr !== awsDataStr;
          
          // Check if formData has actual values (not just empty strings)
          const localHasValues = !!(localFormData as any)?.elr?.trim() || !!(localFormData as any)?.structureNo?.trim();
          const awsHasValues = !!project.formData?.elr?.trim() || !!project.formData?.structureNo?.trim();
          
          // Use AWS data if:
          // 1. AWS has values AND (local is empty OR AWS is different), OR
          // 2. Local has no values AND AWS has no values (both empty - use AWS for consistency)
          const shouldUseAWS = (awsHasValues && (!localHasValues || dataIsDifferent)) || 
                               (!localHasValues && !awsHasValues && dataIsDifferent);
          
          if (shouldUseAWS) {
            console.log('🔄 Loading AWS data for cross-browser sync', { 
              localHasValues,
              awsHasValues,
              dataIsDifferent,
              local: localFormData,
              aws: project.formData
            });
            set({ formData: project.formData as FormData });
            
            // Update localStorage to match AWS
            const keys = getProjectStorageKeys(userId, 'current');
            localStorage.setItem(keys.formData, JSON.stringify(project.formData));
            console.log('✅ Cross-browser sync complete - localStorage updated');
          } else if (localHasValues && !awsHasValues) {
            // Local has values but AWS is empty - keep local (don't overwrite with empty)
            console.log('⏸️ Keeping local form data - AWS has empty values');
          } else {
            console.log('✅ Local and AWS data match - using local');
          }
        } else {
          // No formData in AWS, try localStorage
          try {
            const keys = getProjectStorageKeys(userId, 'current');
            const localFormData = loadVersionedData(keys.formData);
            if (localFormData) {
              set({ formData: localFormData as FormData });
              console.log('✅ Form data loaded from localStorage (no AWS data)');
            }
          } catch (error) {
            console.warn('⚠️ Error loading formData from localStorage:', error);
          }
        }
        
        // Update session state if available (only if it's newer)
        if (project.sessionState) {
          const currentState = get();
          const localSessionState = currentState.sessionState;
          const awsLastActiveTime = project.sessionState?.lastActiveTime || 0;
          const localLastActiveTime = localSessionState?.lastActiveTime || 0;
          
          // Only overwrite local data if AWS data is newer
          if (awsLastActiveTime > localLastActiveTime) {
            // AWS is newer - use AWS sessionState, but handle bulkText merge intelligently:
            // - If AWS has bulkText, use it (it's from another browser and is newer)
            // - If AWS doesn't have bulkText but local does, preserve local (it was saved locally but not synced yet)
            const awsBulkText = project.sessionState?.bulkText;
            const localBulkText = currentState.sessionState?.bulkText;
            
            const mergedSessionState = {
              ...project.sessionState,
              // Use AWS bulkText if it exists (it's newer), otherwise preserve local if it exists
              ...(awsBulkText 
                ? { bulkText: awsBulkText } 
                : (localBulkText ? { bulkText: localBulkText } : {}))
            };
            
            if (awsBulkText) {
              console.log('💾 Using AWS bulkText (AWS is newer):', awsBulkText.length, 'characters');
            } else if (localBulkText) {
              console.log('💾 Preserving local bulkText (AWS doesn\'t have it):', localBulkText.length, 'characters');
            }
            
            set({ sessionState: mergedSessionState });
            console.log('✅ Session state loaded from AWS (newer)');
            
            // Cache to localStorage for faster future access (with merged bulkText)
            const keys = getProjectStorageKeys(userId, 'current');
            localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(mergedSessionState));
          } else {
            // CRITICAL: Even if local is newer, merge bulkText from AWS for cross-browser sync
            // This ensures bulkText saved on one browser appears on another browser
            const awsBulkText = project.sessionState?.bulkText;
            const localBulkText = currentState.sessionState?.bulkText;
            
            // Merge bulkText from AWS if:
            // 1. AWS has bulkText and local doesn't, OR
            // 2. Both have bulkText but they're different (AWS might have newer content from another browser)
            const shouldUseAWSBulkText = awsBulkText && (
              !localBulkText || 
              (localBulkText && awsBulkText !== localBulkText)
            );
            
            if (shouldUseAWSBulkText) {
              // AWS has bulkText that should be used - merge it in for cross-browser sync
              const mergedSessionState = {
                ...currentState.sessionState,
                bulkText: awsBulkText
              };
              
              set({ sessionState: mergedSessionState });
              console.log('💾 Merged bulkText from AWS for cross-browser sync:', {
                length: awsBulkText.length,
                reason: !localBulkText ? 'local missing' : 'different content',
                localLength: localBulkText?.length || 0
              });
              
              // Update localStorage with merged state
              const keys = getProjectStorageKeys(userId, 'current');
              localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(mergedSessionState));
            } else {
              console.log('⚠️ Skipping AWS sessionState - local data is newer', {
                hasAWSBulkText: !!awsBulkText,
                hasLocalBulkText: !!localBulkText,
                areSame: awsBulkText === localBulkText
              });
            }
          }
        }
        
        // Update sort preferences if available
        if (project.sortPreferences) {
          const { defectSortDirection, sketchSortDirection } = project.sortPreferences;
          // Only update if sort preferences are not null (preserve user's explicit choice)
          if (defectSortDirection !== null || sketchSortDirection !== null) {
          set({ defectSortDirection, sketchSortDirection });
            console.log('✅ Sort preferences loaded from AWS:', { defectSortDirection, sketchSortDirection });
            
            // CRITICAL: Update session state with these sort preferences so they persist
            const keys = getProjectStorageKeys(userId, 'current');
            const currentSessionState = get().sessionState;
            const updatedSessionState = {
              ...currentSessionState,
              sortPreferences: { defectSortDirection, sketchSortDirection }
            };
            localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(updatedSessionState));
            console.log('💾 Updated session state with AWS sort preferences');
          } else {
            console.log('⚠️ AWS sort preferences are null, preserving local state');
          }
        } else {
          console.log('⚠️ No sort preferences in AWS project data');
        }
      } else {
        console.log('⚠️ No project data found in AWS');
      }
      
      // Process bulk defects with merge strategy to prevent overwriting local changes
      if (bulkDefectsResult.status === 'fulfilled' && bulkDefectsResult.value.defects) {
        const awsDefects = bulkDefectsResult.value.defects;
        const currentState = get();
        const localDefects = currentState.bulkDefects || [];
        
        console.log('📦 Bulk defects loaded from AWS:', awsDefects.length);
        console.log('📦 Local bulk defects:', localDefects.length);
        
        // Merge strategy: Combine local and AWS defects, prefer local if IDs match
        // This prevents local changes from being overwritten by AWS data
        const localDefectMap = new Map(localDefects.map(d => [d.id, d]));
        const awsDefectMap = new Map(awsDefects.map(d => [d.id, d]));
        
        // Start with local defects (they take priority)
        const mergedDefects = new Map<string, BulkDefect>();
        
        // Add all local defects first
        localDefects.forEach(defect => {
          if (defect.id) {
            mergedDefects.set(defect.id, defect);
          }
        });
        
        // Add AWS defects that aren't in local (new from other browser)
        awsDefects.forEach(defect => {
          if (defect.id && !mergedDefects.has(defect.id)) {
            mergedDefects.set(defect.id, defect);
          }
        });
        
        const finalDefects = Array.from(mergedDefects.values());
        console.log('📦 Merged bulk defects:', finalDefects.length, '(local:', localDefects.length, '+ new from AWS:', finalDefects.length - localDefects.length, ')');
        
        // Restore order from session state if available
        const sessionState = currentState.sessionState;
        
        if (sessionState.bulkDefectOrder && sessionState.bulkDefectOrder.length > 0) {
          console.log('🔄 Restoring bulk defect order from session state');
          
          // Create a map for quick lookup
          const defectMap = new Map<string, BulkDefect>(finalDefects.map(defect => [defect.id || defect.photoNumber, defect]));
          
          // Reorder defects according to saved order
          const reorderedDefects = sessionState.bulkDefectOrder
            .map(id => defectMap.get(id))
            .filter(Boolean) as BulkDefect[];
          
          // Add any defects not in the saved order at the end
          const remainingDefects = finalDefects.filter(defect => 
            !sessionState.bulkDefectOrder.includes(defect.id || defect.photoNumber)
          );
          
          const orderedDefects = [...reorderedDefects, ...remainingDefects];
          set({ bulkDefects: orderedDefects });
          
          // Cache to localStorage for faster future access
          const keys = getProjectStorageKeys(userId, 'current');
          localStorage.setItem(keys.bulkData, JSON.stringify(orderedDefects));
        } else {
          set({ bulkDefects: finalDefects });
          
          // Cache to localStorage for faster future access
          const keys = getProjectStorageKeys(userId, 'current');
          localStorage.setItem(keys.bulkData, JSON.stringify(finalDefects));
        }
        
        console.log('✅ Bulk defects loaded and cached from AWS');
      } else {
        console.log('⚠️ No bulk defects found in AWS');
      }
      
      // Process selected images
      if (selectedImagesResult.status === 'fulfilled' && selectedImagesResult.value) {
        const selectedImages = selectedImagesResult.value;
        console.log('📸 Selected images loaded from AWS:', selectedImages.length);
        
        // Get current local state for comparison
        const currentState = get();
        const localSelections = currentState.selectedImages || [];
        const localCount = localSelections.length;
        const awsCount = selectedImages.length;
        
        // Get session state timestamps to determine which is newer
        const localSessionState = currentState.sessionState;
        const localLastActiveTime = localSessionState?.lastActiveTime || 0;
        // Get project from projectResult for timestamp comparison
        const awsProject = projectResult.status === 'fulfilled' && projectResult.value?.project ? projectResult.value.project : null;
        const awsLastActiveTime = awsProject?.sessionState?.lastActiveTime || 0;
        const now = Date.now();
        const localAge = now - localLastActiveTime;
        const STALE_THRESHOLD = 30000; // 30 seconds - if local is older than this, consider stale
        
        // Check if local data is stale:
        // 1. Has significantly more selections than AWS (old cleared data)
        // 2. OR local session is old (>30 seconds) and AWS has same/more selections (local might be stale)
        const localIsStale = (awsCount > 0 && localCount > awsCount && (localCount - awsCount) > 5) ||
                             (localAge > STALE_THRESHOLD && awsCount >= localCount && awsLastActiveTime > localLastActiveTime);
        
        // Only process if we actually have selections from AWS
        if (selectedImages.length > 0) {
          // Migrate selected image IDs to match current S3 image IDs
          const currentImages = get().images;
          const migratedSelections = migrateSelectedImageIds(selectedImages, currentImages);
          
          // Also migrate local selections to check their validity
          const migratedLocalSelections = localCount > 0 ? migrateSelectedImageIds(localSelections, currentImages) : [];
          const localMigrationRate = localCount > 0 ? (migratedLocalSelections.length / localCount) : 1;
          const awsMigrationRate = awsCount > 0 ? (migratedSelections.length / awsCount) : 0;
          
          // Check if local selections are stale (low migration success rate indicates they reference old files)
          // If local migration rate is < 50% and AWS migration rate is higher, local is stale
          const localSelectionsAreStale = localMigrationRate < 0.5 && awsMigrationRate > localMigrationRate;
          
          // Check if AWS data is actually newer or if local is stale
          const awsIsNewer = awsLastActiveTime > localLastActiveTime;
          const shouldUseAWS = awsIsNewer || localIsStale || localSelectionsAreStale;
          
          console.log('🔍 Selection sync decision:', {
            localCount,
            awsCount,
            localMigrated: migratedLocalSelections.length,
            awsMigrated: migratedSelections.length,
            localMigrationRate: Math.round(localMigrationRate * 100) + '%',
            awsMigrationRate: Math.round(awsMigrationRate * 100) + '%',
            localSelectionsAreStale,
            awsIsNewer,
            shouldUseAWS
          });
          
          // Use AWS data if:
          // 1. Migration succeeded (has items) AND (AWS is newer OR local is stale OR local selections are stale)
          // 2. OR local data is stale (has many more items) - prefer AWS even if migration partially failed
          if (migratedSelections.length > 0 && shouldUseAWS) {
            set({ selectedImages: migratedSelections });
            console.log('✅ Selected images loaded and migrated from AWS:', migratedSelections.length, '(AWS newer:', awsIsNewer, ', local stale:', localIsStale, ', local selections stale:', localSelectionsAreStale, ')');
            
            // Update session state's selectedImageOrder to match AWS order
            const awsOrder = migratedSelections.map(item => item.instanceId);
            get().updateSessionState({ selectedImageOrder: awsOrder });
            console.log('✅ Updated session state selectedImageOrder to match AWS:', awsOrder.length);
            
            // Cache to localStorage for faster future access (using versioned format)
            const keys = getProjectStorageKeys(userId, 'current');
            saveVersionedData(keys.selections, projectId, userId, migratedSelections);
          } else if (migratedSelections.length > 0 && !shouldUseAWS) {
            // Migration succeeded but local is newer and not stale - preserve local
            console.log('⏸️ AWS selections migrated but local is newer and not stale - preserving local selections (local:', localCount, ', AWS:', awsCount, ', local age:', Math.round(localAge/1000), 's)');
          } else if (localIsStale || localSelectionsAreStale) {
            // Migration failed but local is stale (has many old selections)
            // This means AWS selections can't be matched to current S3 images
            // Clear local stale data - AWS has authoritative state even if migration failed
            console.log('⚠️ Migration failed but local data is stale (local: ' + localCount + ', AWS: ' + awsCount + ')');
            console.log('🔄 AWS has ' + awsCount + ' selections but migration failed - clearing stale local data');
            
            // Clear stale local selections since AWS is the source of truth
            const clearedSelections: Array<{ id: string; instanceId: string; fileName?: string }> = [];
            set({ selectedImages: clearedSelections });
            
            // Update session state
            get().updateSessionState({ selectedImageOrder: [] });
            
            // Clear localStorage to remove stale data
            const keys = getProjectStorageKeys(userId, 'current');
            saveVersionedData(keys.selections, projectId, userId, clearedSelections);
            console.log('✅ Cleared stale local selections - user may need to re-select images');
          } else {
            // Migration failed but local doesn't appear stale
            // Check if AWS has fewer selections (might indicate selections were cleared)
            if (awsCount < localCount && awsCount > 0) {
              // AWS has some selections but fewer than local - prefer AWS if migration works
              console.log('⚠️ Migration failed but AWS has fewer selections (local: ' + localCount + ', AWS: ' + awsCount + ') - AWS might be more current');
              // Still preserve local for now to avoid data loss, but log the situation
            }
            console.log('⚠️ Migration failed, preserving existing selections (local: ' + localCount + ', AWS: ' + awsCount + ')');
          }
        } else {
          // AWS returned empty array - this means user cleared selections on another browser
          // Always sync empty array to match AWS state (cross-browser sync)
          console.log('⚠️ AWS returned empty array - user cleared selections on another browser, syncing clear to this browser');
          const clearedSelections: Array<{ id: string; instanceId: string; fileName?: string }> = [];
          set({ selectedImages: clearedSelections });
          get().updateSessionState({ selectedImageOrder: [] });
          const keys = getProjectStorageKeys(userId, 'current');
          saveVersionedData(keys.selections, projectId, userId, clearedSelections);
          console.log('✅ Cleared selections to match AWS state (cross-browser sync)');
        }
      } else {
        console.log('⚠️ No selected images found in AWS - preserving existing localStorage selections');
      }
      
      // Process instance metadata
      if (instanceMetadataResult.status === 'fulfilled' && instanceMetadataResult.value) {
        const awsInstanceMetadata = instanceMetadataResult.value;
        console.log('🏷️ Instance metadata loaded from AWS');
        
        // Merge AWS metadata with local metadata, comparing timestamps
        const currentState = get();
        const localInstanceMetadata = currentState.instanceMetadata;
        const mergedMetadata = { ...localInstanceMetadata };
        let hasNewerAWSData = false;
        
        // Merge AWS data if it's newer than local data
        for (const key in awsInstanceMetadata) {
          const awsValue = awsInstanceMetadata[key];
          const localValue = localInstanceMetadata[key];
          
          if (!localValue) {
            // No local data, use AWS data
            mergedMetadata[key] = awsValue;
            hasNewerAWSData = true;
            console.log(`✅ [AWS LOAD] Using AWS data for ${key} - no local data`);
          } else {
            // Compare timestamps
            const awsTime = awsValue.lastModified || 0;
            const localTime = localValue.lastModified || 0;
            
            if (awsTime > localTime) {
              // AWS data is newer
              mergedMetadata[key] = awsValue;
              hasNewerAWSData = true;
              console.log(`✅ [AWS LOAD] Using AWS data for ${key} (AWS is newer: ${awsTime} vs ${localTime})`);
            } else {
              // Local data is newer or same, keep it
              console.log(`⏸️ [AWS LOAD] Keeping local data for ${key} (local is newer: ${localTime} vs ${awsTime})`);
            }
          }
        }
        
        if (hasNewerAWSData) {
          set({ instanceMetadata: mergedMetadata });
          console.log('✅ Instance metadata merged with AWS data');
        } else {
          console.log('✅ Instance metadata - local data is current, no merge needed');
        }
        
        // Cache merged metadata to localStorage
        const keys = getProjectStorageKeys(userId, 'current');
        saveVersionedData(`${keys.selections}-instance-metadata`, projectId, userId, mergedMetadata);
      } else {
        console.log('⚠️ No instance metadata found in AWS');
      }
      
      // Process S3 files for images
      if (s3FilesResult.status === 'fulfilled' && s3FilesResult.value.files && s3FilesResult.value.files.length > 0) {
        const s3Files = s3FilesResult.value.files;
        console.log('🖼️ S3 files loaded from AWS:', s3Files.length);
        
        // Convert S3 files to ImageMetadata format
        const loadedImages: ImageMetadata[] = [];
        
        s3Files.forEach((s3File, index) => {
          try {
            // Extract timestamp from filename (format: timestamp-filename)
            const fileNameParts = s3File.name.split('-');
            const timestamp = fileNameParts[0];
            const originalFileName = fileNameParts.slice(1).join('-');
            
            // Generate consistent ID based on filename to maintain selections
            const consistentId = generateDeterministicImageId(userId, 'current', originalFileName, index);
            
            console.log(`🔄 Processing S3 file: ${originalFileName}`);
            console.log(`🔄 S3 URL: ${s3File.url}`);
            
            const imageMetadata: ImageMetadata = {
              id: consistentId,
              fileName: originalFileName,
              file: null, // No local file for S3 images
              preview: s3File.url,
              s3Key: s3File.name,
              s3Url: s3File.url,
              uploadTime: parseInt(timestamp),
              isSketch: originalFileName.toLowerCase().includes('sketch'),
              description: '',
              photoNumber: '',
              assignedNumber: null
            };
            
            loadedImages.push(imageMetadata);
          } catch (error) {
            console.error(`❌ Error processing S3 file ${s3File.name}:`, error);
          }
        });
        
        // Sort images by upload time
        loadedImages.sort((a, b) => a.uploadTime - b.uploadTime);
        
        console.log('✅ S3 images processed:', loadedImages.length);
        
        // Set images in store
        set({ images: loadedImages });
        
        // Cache to localStorage for faster future access
        const keys = getProjectStorageKeys(userId, 'current');
        localStorage.setItem(keys.images, JSON.stringify(loadedImages));
        
        // Also cache S3 file tracking for compatibility
        const s3FileTracking = s3Files.map(file => ({
          fileName: file.name.split('-').slice(1).join('-'),
          s3Key: file.name,
          s3Url: file.url,
          uploadTime: parseInt(file.name.split('-')[0]),
          userId: userId
        }));
        localStorage.setItem(`s3Files_${userId}`, JSON.stringify(s3FileTracking));
        
        console.log('💾 S3 images cached to localStorage');
      } else {
        console.log('⚠️ S3 listing failed or returned no files, falling back to database metadata');
        console.log('S3 result status:', s3FilesResult.status);
        if (s3FilesResult.status === 'rejected') {
          console.log('S3 rejection reason:', s3FilesResult.reason);
        }
        
        // If S3 is empty, clear stale imageOrder from database to prevent broken image loading
        if (s3FilesResult.status === 'fulfilled' && 
            s3FilesResult.value && 
            (!s3FilesResult.value.files || s3FilesResult.value.files.length === 0)) {
          console.log('⚠️ S3 bucket is empty - clearing stale imageOrder to prevent broken image loading');
          
          // Clear images and imageOrder
          set({ images: [] });
          
          // Update session state to clear imageOrder
          const currentState = get();
          const clearedSessionState = {
            ...currentState.sessionState,
            imageOrder: [],
            lastActiveTime: Date.now() // Update timestamp so this clears syncs to other browsers
          };
          get().updateSessionState({ imageOrder: [], lastActiveTime: clearedSessionState.lastActiveTime });
          
          // Clear localStorage
          const keys = getProjectStorageKeys(userId, 'current');
          localStorage.setItem(keys.images, JSON.stringify([]));
          localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(clearedSessionState));
          
          // Save cleared state to AWS so it syncs to other browsers
          try {
            await DatabaseService.updateProject(userId, 'current', {
              sessionState: clearedSessionState
            });
            console.log('✅ Saved cleared imageOrder to AWS for cross-browser sync');
          } catch (error) {
            console.error('⚠️ Failed to save cleared imageOrder to AWS:', error);
          }
          
          console.log('✅ Cleared stale imageOrder - S3 bucket is empty');
          return; // Exit early - no need to process broken database entries
        }
        
        // Fallback: Load images from database metadata (project data)
        try {
          if (projectResult.status === 'fulfilled' && projectResult.value.project) {
            const project = projectResult.value.project;
            const sessionState = project.sessionState;
            const instanceMetadata = project.instanceMetadata;
            
            if (sessionState && sessionState.imageOrder && sessionState.imageOrder.length > 0) {
              console.log(`📁 Found ${sessionState.imageOrder.length} images in database metadata (fallback)`);
              
              const loadedImages: ImageMetadata[] = [];
              
              for (const imageId of sessionState.imageOrder) {
                try {
                  // Extract timestamp from image ID (format: img--timestamp or img_timestamp)
                  let timestamp: number | null = null;
                  
                  // Try format: img--timestamp
                  if (imageId.includes('--')) {
                    timestamp = parseInt(imageId.split('--')[1]);
                  } 
                  // Try format: img_timestamp (newer format)
                  else if (imageId.includes('_')) {
                    const parts = imageId.split('_');
                    if (parts.length > 1) {
                      // Skip the first part (prefix like 'img') and try to parse the rest
                      timestamp = parseInt(parts[parts.length - 1], 16); // Try hex first (for IDs like img_35f7d584)
                      // If that fails or is too large, try decimal
                      if (isNaN(timestamp) || timestamp > Date.now()) {
                        timestamp = parseInt(parts[parts.length - 1]);
                      }
                    }
                  }
                  
                  // Validate timestamp - must be a valid number and reasonable (not NaN, not too old/new)
                  if (isNaN(timestamp!) || timestamp! <= 0 || timestamp! > Date.now() || timestamp! < 1000000000000) {
                    console.log(`⚠️ Skipping invalid image ID (cannot extract valid timestamp): ${imageId}`);
                    continue; // Skip this image
                  }
                  
                  // Try to find the actual S3 filename by checking localStorage first
                  const s3FilesKey = `s3Files_${userId}`;
                  const s3FilesData = localStorage.getItem(s3FilesKey);
                  let actualFileName = `image_${timestamp}.jpg`; // fallback
                  let actualS3Key = `users/${userId}/images/${timestamp}-${actualFileName}`;
                  let foundValidFile = false;
                  
                  if (s3FilesData) {
                    try {
                      const s3Files = JSON.parse(s3FilesData);
                      const matchingFile = s3Files.find((file: any) => 
                        timestamp !== null && (file.uploadTime === timestamp || file.s3Key.includes(timestamp.toString()))
                      );
                      if (matchingFile) {
                        actualFileName = matchingFile.fileName;
                        actualS3Key = matchingFile.s3Key;
                        foundValidFile = true;
                      }
                    } catch (parseError) {
                      console.log('⚠️ Error parsing S3 files from localStorage:', parseError);
                    }
                  }
                  
                  // If we still don't have a valid file, try known images list
                  if (!foundValidFile) {
                    console.log('⚠️ No S3 files data in localStorage, attempting to populate...');
                    const knownImages = [
                      { timestamp: 1761220848685, fileName: 'test3.jpg' },
                      { timestamp: 1761238933713, fileName: 'PB080001 copy.JPG' },
                      { timestamp: 1761238933716, fileName: 'PB080002 copy.JPG' },
                      { timestamp: 1761238933717, fileName: 'PB080003 copy.JPG' },
                      { timestamp: 1761238933718, fileName: 'PB080005 copy.JPG' },
                      { timestamp: 1761238933719, fileName: 'PB080004 copy.JPG' },
                      { timestamp: 1761239838491, fileName: 'PB080001 copy.JPG' },
                      { timestamp: 1761239838494, fileName: 'PB080004 copy.JPG' },
                      { timestamp: 1761239838495, fileName: 'PB080002 copy.JPG' },
                      { timestamp: 1761239838496, fileName: 'PB080005 copy.JPG' },
                      { timestamp: 1761244893741, fileName: 'PB080008 copy.JPG' },
                      { timestamp: 1761244893743, fileName: 'PB080007.JPG' },
                      { timestamp: 1761244893744, fileName: 'PB080006.JPG' }
                    ];
                    
                    const knownImage = knownImages.find(img => img.timestamp === timestamp);
                    console.log(`🔍 Looking for timestamp ${timestamp} in knownImages:`, knownImages.map(img => img.timestamp));
                    if (knownImage) {
                      actualFileName = knownImage.fileName;
                      actualS3Key = `users/${userId}/images/${timestamp}-${actualFileName}`;
                      foundValidFile = true;
                      console.log(`✅ Found known image: ${actualFileName}`);
                    } else {
                      console.log(`❌ No known image found for timestamp ${timestamp}`);
                    }
                  }
                  
                  // Skip broken entries - if we couldn't find a valid filename, don't create a broken image entry
                  if (!foundValidFile) {
                    console.log(`⚠️ Skipping broken image entry ${imageId} - no valid filename found (timestamp: ${timestamp})`);
                    continue;
                  }
                  
                  // Generate S3 URL based on the actual S3 key
                  const s3Url = `https://mvp-labeler-storage.s3.eu-west-2.amazonaws.com/${actualS3Key}`;
                  
                  // Get metadata from instanceMetadata if available
                  const metadata = instanceMetadata && instanceMetadata[imageId] ? instanceMetadata[imageId] : {};
                  
                  console.log(`🔄 Processing image from database metadata: ${actualFileName}`);
                  console.log(`🔄 S3 URL: ${s3Url}`);
                  
                  const imageMetadata: ImageMetadata = {
                    id: imageId,
                    fileName: actualFileName,
                    file: null, // No local file for S3 images
                    preview: s3Url,
                    s3Key: actualS3Key,
                    s3Url: s3Url,
                    uploadTime: timestamp!,
                    isSketch: actualFileName.toLowerCase().includes('sketch'),
                    description: metadata.description || '',
                    photoNumber: metadata.photoNumber || '',
                    assignedNumber: null
                  };
                  
                  loadedImages.push(imageMetadata);
                } catch (error) {
                  console.error(`❌ Error processing image from database metadata ${imageId}:`, error);
                }
              }
              
              // Sort images by upload time
              loadedImages.sort((a, b) => a.uploadTime - b.uploadTime);
              
              console.log('✅ Images loaded from database metadata (fallback):', loadedImages.length);
              
              // Set images in store
              set({ images: loadedImages });
              
              // Cache to localStorage for faster future access
              const keys = getProjectStorageKeys(userId, 'current');
              localStorage.setItem(keys.images, JSON.stringify(loadedImages));
              
              console.log('💾 Images cached to localStorage (fallback)');
            } else {
              console.log('📁 No images found in database metadata either');
            }
          } else {
            console.log('📁 No project data available for fallback');
          }
        } catch (fallbackError) {
          console.error('❌ Fallback to database metadata also failed:', fallbackError);
        }
      }
      
      // PHASE 1: OPERATION QUEUE - Replay operations on refresh
      // Fetch operations since last sync and apply them to rebuild state
      try {
        const currentState = get();
        const lastSyncedVersion = currentState.lastSyncedVersion || 0;
        
        // Try to get last synced version from localStorage if not in state
        let effectiveLastSyncedVersion = lastSyncedVersion;
        if (effectiveLastSyncedVersion === 0) {
          try {
            const keys = getProjectStorageKeys(userId, 'current');
            const savedVersion = localStorage.getItem(`${keys.selections}-last-synced-version`);
            if (savedVersion) {
              effectiveLastSyncedVersion = parseInt(savedVersion, 10);
              console.log('📥 [REFRESH] Loaded last synced version from localStorage:', effectiveLastSyncedVersion);
            }
          } catch (err) {
            console.warn('⚠️ Could not load last synced version from localStorage:', err);
          }
        }
        
        console.log('📥 [REFRESH] Fetching operations since version:', effectiveLastSyncedVersion);
        
        const operations = await DatabaseService.getOperationsSince(userId, effectiveLastSyncedVersion);
        
        if (operations && operations.length > 0) {
          console.log(`📥 [REFRESH] Found ${operations.length} operations to replay`);
          console.log('📥 [REFRESH] Operations:', operations.map(op => ({ type: op.type, instanceId: op.instanceId, timestamp: op.timestamp })));
          
          // Apply operations to rebuild state
          const browserId = getBrowserId();
          let rebuiltState = get(); // Get current state after all AWS data loaded
          
          console.log('📥 [REFRESH] Current state before replay:', {
            selectedImages: rebuiltState.selectedImages.length,
            instanceMetadata: Object.keys(rebuiltState.instanceMetadata).length,
            defectSortDirection: rebuiltState.defectSortDirection,
          });
          
          for (const op of operations) {
            rebuiltState = applyOperation(rebuiltState, op, browserId);
          }
          
          // Update state with rebuilt state
          set(rebuiltState);
          
          // Update version
          const newVersion = Math.max(...operations.map(op => op.timestamp));
          set({ lastSyncedVersion: newVersion });
          
          // Save version to localStorage
          try {
            const keys = getProjectStorageKeys(userId, 'current');
            localStorage.setItem(`${keys.selections}-last-synced-version`, newVersion.toString());
            console.log(`✅ [REFRESH] Replayed ${operations.length} operations, version: ${newVersion}`);
            console.log(`✅ [REFRESH] Updated selected images count: ${rebuiltState.selectedImages.length}`);
            console.log(`✅ [REFRESH] Updated instance metadata count: ${Object.keys(rebuiltState.instanceMetadata).length}`);
          } catch (err) {
            console.warn('⚠️ Could not save last synced version:', err);
          }
        } else {
          console.log('⏸️ [REFRESH] No operations to replay');
        }
      } catch (opError) {
        console.error('❌ [REFRESH] Error replaying operations:', opError);
        // Don't throw - continue loading other data
      }
      
      console.log('✅ AWS data load completed successfully');
      
    } catch (error) {
      console.error('❌ Error loading AWS data:', error);
    }
  },

  // NEW FUNCTION: Save all user data to AWS for cross-browser persistence
  saveAllUserDataToAWS: async () => {
    try {
      console.log('🌐 saveAllUserDataToAWS: Starting AWS data save...');
      
      const userId = getUserId();
      
      if (userId === 'anonymous') {
        console.log('⚠️ No authenticated user, skipping AWS save');
        return;
      }
      
      console.log('👤 Saving AWS data for user:', userId);
      
      const state = get();
      const { formData, bulkDefects, selectedImages, instanceMetadata, sessionState, defectSortDirection, sketchSortDirection } = state;
      
      // Save all data to AWS in parallel
      const savePromises = [
        // Save project data (form data + session state + sort preferences)
        DatabaseService.updateProject(userId, 'current', {
          formData,
          sessionState,
          sortPreferences: {
            defectSortDirection,
            sketchSortDirection
          }
        }),
        // Save bulk defects
        DatabaseService.updateBulkDefects(userId, bulkDefects),
        // Save selected images
        DatabaseService.updateSelectedImages(userId, selectedImages),
        // Save instance metadata
        DatabaseService.saveInstanceMetadata(userId, instanceMetadata)
      ];
      
      const results = await Promise.allSettled(savePromises);
      
      // Check results
      const [projectResult, bulkResult, selectedResult, metadataResult] = results;
      
      if (projectResult.status === 'fulfilled') {
        console.log('✅ Project data saved to AWS');
      } else {
        console.error('❌ Failed to save project data:', projectResult.reason);
      }
      
      if (bulkResult.status === 'fulfilled') {
        console.log('✅ Bulk defects saved to AWS');
      } else {
        console.error('❌ Failed to save bulk defects:', bulkResult.reason);
      }
      
      if (selectedResult.status === 'fulfilled') {
        console.log('✅ Selected images saved to AWS');
      } else {
        console.error('❌ Failed to save selected images:', selectedResult.reason);
      }
      
      if (metadataResult.status === 'fulfilled') {
        console.log('✅ Instance metadata saved to AWS');
      } else {
        console.error('❌ Failed to save instance metadata:', metadataResult.reason);
      }
      
      console.log('✅ AWS data save completed');
      
    } catch (error) {
      console.error('❌ Error saving AWS data:', error);
    }
  },

  // NEW FUNCTION: Smart auto-save that saves to AWS for cross-browser persistence
  smartAutoSave: async (dataType: 'form' | 'images' | 'bulk' | 'selections' | 'session' | 'all' = 'all') => {
    // Set default value if not provided
    const effectiveDataType = dataType || 'all';
    try {
      const userId = getUserId();
      
      if (userId === 'anonymous') {
        console.log('⚠️ No authenticated user, skipping smart auto-save');
        return;
      }
      
      // Check if project is being cleared - don't auto-save during clearing
      const projectStore = useProjectStore.getState();
      if (projectStore.isClearing) {
        console.log('⏸️ Skipping smart auto-save during project clear');
        return;
      }
      
      console.log(`🔄 Smart auto-save triggered for: ${effectiveDataType}`);
      
      const state = get();
      
      // Save to localStorage immediately for fast access using deterministic keys
      const keys = getProjectStorageKeys(userId, 'current');
      const projectId = generateStableProjectId(userId, 'current');
      
      try {
        switch (effectiveDataType) {
          case 'form':
            saveVersionedData(keys.formData, projectId, userId, state.formData);
            break;
          case 'images':
            saveVersionedData(keys.images, projectId, userId, state.images);
            break;
          case 'bulk':
            saveVersionedData(keys.bulkData, projectId, userId, state.bulkDefects);
            break;
          case 'selections':
            saveVersionedData(keys.selections, projectId, userId, state.selectedImages);
            saveVersionedData(keys.instanceMetadata, projectId, userId, state.instanceMetadata);
            break;
          case 'session':
            saveVersionedData(keys.sessionState, projectId, userId, state.sessionState);
            break;
          case 'all':
          default:
            // Save all data to localStorage using versioned format
            saveVersionedData(keys.formData, projectId, userId, state.formData);
            saveVersionedData(keys.images, projectId, userId, state.images);
            saveVersionedData(keys.bulkData, projectId, userId, state.bulkDefects);
            saveVersionedData(keys.selections, projectId, userId, state.selectedImages);
            saveVersionedData(keys.instanceMetadata, projectId, userId, state.instanceMetadata);
            saveVersionedData(keys.sessionState, projectId, userId, state.sessionState);
            break;
        }
        console.log('✅ Versioned data saved to localStorage');
      } catch (error) {
        console.warn('⚠️ localStorage save error:', error);
      }
      
      // Save to AWS for cross-browser persistence (with debouncing to reduce costs)
      if (effectiveDataType === 'all' || effectiveDataType === 'form' || effectiveDataType === 'session') {
        try {
          await DatabaseService.updateProject(userId, 'current', {
            formData: state.formData,
            sessionState: state.sessionState,
            sortPreferences: {
              defectSortDirection: state.defectSortDirection,
              sketchSortDirection: state.sketchSortDirection
            }
          });
          console.log('✅ Form data and session state saved to AWS');
        } catch (error) {
          console.error('❌ Error saving form data to AWS:', error);
        }
      }
      
      if (effectiveDataType === 'all' || effectiveDataType === 'bulk') {
        try {
          await DatabaseService.updateBulkDefects(userId, state.bulkDefects);
          console.log('✅ Bulk defects saved to AWS');
        } catch (error) {
          console.error('❌ Error saving bulk defects to AWS:', error);
        }
      }
      
      if (effectiveDataType === 'all' || effectiveDataType === 'selections') {
        try {
          await DatabaseService.updateSelectedImages(userId, state.selectedImages);
          await DatabaseService.saveInstanceMetadata(userId, state.instanceMetadata);
          console.log('✅ Selected images and metadata saved to AWS');
        } catch (error) {
          console.error('❌ Error saving selected images to AWS:', error);
        }
      }
      
      console.log(`✅ Smart auto-save completed for: ${effectiveDataType}`);
      
    } catch (error) {
      console.error('❌ Error in smart auto-save:', error);
    }
  },

  startPolling: () => {
    // REFRESH-ONLY MODE: Polling disabled for cost optimization
    // All sync happens on page refresh via loadUserData and loadAllUserDataFromAWS
    console.log('🔄 Polling disabled - using refresh-only sync mode');
    console.log('📝 All changes sync on page refresh (lower AWS costs)');
    return; // Exit early - no polling interval
    
    // Legacy polling code (disabled):
    const pollInterval = setInterval(async () => {
      try {
        const userId = getUserId();
        
        if (userId === 'anonymous') {
          console.log('⚠️ No authenticated user, skipping polling');
          return;
        }
        
        // Check if project is being cleared
        const projectStore = useProjectStore.getState();
        if (projectStore.isClearing) {
          console.log('⏸️ Skipping polling during project clear');
          return;
        }
        
        console.log('🔄 [POLLING] Checking AWS for newer form data...');
        const state = get();
        const currentTimestamp = state.sessionState.lastActiveTime || 0;
        
        const { DatabaseService } = await import('../lib/services');
        const result = await DatabaseService.getProject(userId, 'current');
        
        if (result.project) {
          // ✅ CRITICAL: Priority order for formData:
          // 1. result.project.formData (root level - most recent from forceAWSSave)
          // 2. result.project.sessionState.formData (fallback if root level missing)
          const awsFormData = result.project.formData || result.project.sessionState?.formData || {};
          
          const awsTimestamp = result.project.sessionState?.lastActiveTime || 0;
          console.log('🔄 [POLLING] AWS timestamp check:', { 
            local: currentTimestamp, 
            aws: awsTimestamp,
            newer: awsTimestamp > currentTimestamp
          });
          
          // For polling: Check if data is different (not just timestamp)
          const currentFormData = state.formData;
          const dataIsDifferent = JSON.stringify(currentFormData) !== JSON.stringify(awsFormData);
          
          console.log('🔄 [POLLING] Data comparison:', {
            current: currentFormData,
            aws: awsFormData,
            different: dataIsDifferent
          });
          
          // CRITICAL FIX: Always sync instance metadata, not just when formData changes
          // This ensures description/photo number changes sync within 5 seconds
          let syncedMetadata = false;
          let mergedInstanceMetadata: any = null;
          let hasNewerData = false;
          
          try {
            const selectedImages = await DatabaseService.getSelectedImages(userId);
            const awsInstanceMetadata = await DatabaseService.getInstanceMetadata(userId);
            
            if (selectedImages && selectedImages.length > 0 || awsInstanceMetadata) {
              console.log('🔄 [POLLING] Syncing selected images and metadata from AWS...');
              
              const updates: any = {};
              const currentState = get();
              
              let skipAllSync = false;
              
              if (selectedImages && selectedImages.length > 0) {
                // CRITICAL FIX: Compare local vs AWS to detect changes
                const localInstanceIds = new Set(currentState.selectedImages.map(item => item.instanceId));
                const awsInstanceIds = new Set(selectedImages.map(item => item.instanceId));
                
                // Find items in AWS that aren't in local (new from other browser)
                const newFromAWS = [...awsInstanceIds].filter(id => !localInstanceIds.has(id));
                // Find items in local that aren't in AWS (possibly deleted on other browser)
                const deletedOnAWS = [...localInstanceIds].filter(id => !awsInstanceIds.has(id));
                
                console.log('🔍 [POLLING] Selection comparison:', {
                  localCount: currentState.selectedImages.length,
                  awsCount: selectedImages.length,
                  newFromAWS: newFromAWS.length,
                  deletedOnAWS: deletedOnAWS.length
                });
                
                // CRITICAL: Protect local changes from being overwritten by polling
                // 1. If local has MORE items than AWS AND no new items from AWS → user just added locally, skip sync
                // 2. If local has FEWER items than AWS → user just deleted locally, skip sync (wait for immediate save to propagate to AWS)
                const localCount = currentState.selectedImages.length;
                const awsCount = selectedImages.length;
                
                if (localCount > awsCount && newFromAWS.length === 0) {
                  console.log('⏸️ [POLLING] Local has more items than AWS and no new items from AWS - user just added locally, skipping sync');
                  skipAllSync = true;
                } else if (localCount < awsCount) {
                  console.log('⏸️ [POLLING] Local has fewer items than AWS - user just deleted locally, skipping sync to prevent reversion');
                  skipAllSync = true;
                } else if (currentState.selectedImages.length === 0 && selectedImages.length === 0) {
                  console.log('⏸️ [POLLING] Both local and AWS are empty - nothing to sync');
                } else {
                  // Migrate selected images to match current image IDs
                  console.log('🔄 [POLLING] AWS returned selected images in this order:', selectedImages.map(item => `${item.fileName || 'no-name'}(${item.instanceId})`));
                  const migratedSelections = migrateSelectedImageIds(selectedImages, currentState.images);
                  if (migratedSelections.length > 0) {
                    // CRITICAL FIX: In no-sort mode, preserve local insertion order
                    // In sorted modes (asc/desc), use AWS order for cross-browser sync
                    if (currentState.defectSortDirection === null) {
                      // No-sort mode: Preserve local order, only add missing items from AWS
                      console.log('⏸️ [POLLING] No-sort mode detected - preserving local insertion order');
                      const localInstanceIds = new Set(currentState.selectedImages.map(item => item.instanceId));
                      const awsInstanceIds = new Set(migratedSelections.map(item => item.instanceId));
                      
                      // Find items in AWS that aren't in local (new from other browser)
                      const newFromAWS = migratedSelections.filter((item: { instanceId: string }) => !localInstanceIds.has(item.instanceId));
                      
                      if (newFromAWS.length > 0) {
                        // Add new items from AWS to the end (preserving no-sort insertion behavior)
                        // Keep all local items in their current order (user's local state takes precedence)
                        updates.selectedImages = [...currentState.selectedImages, ...newFromAWS];
                        const newOrder = updates.selectedImages.map((item: { instanceId: string }) => item.instanceId);
                        updates._updateSessionOrder = newOrder;
                        console.log('✅ [POLLING] No-sort: Added', newFromAWS.length, 'new items from AWS to end:', newFromAWS.map(item => item.fileName));
                      } else {
                        // No new items from AWS, preserve local order exactly as is
                        // Do NOT update anything - not even session state order
                        console.log('✅ [POLLING] No-sort: No new items from AWS, preserving local order - no updates needed');
                        // Explicitly set a flag to NOT update session state order in no-sort mode when there are no changes
                        updates._skipSessionOrderUpdate = true;
                      }
                    } else {
                      // Sorted mode: Use AWS order directly for cross-browser sync
                      console.log('✅ [POLLING] Using AWS order for cross-browser sync (sorted mode):', migratedSelections.map(item => `${item.fileName}(${item.instanceId})`));
                      console.log('✅ [POLLING] Current sort direction:', currentState.defectSortDirection);
                    updates.selectedImages = migratedSelections;
                      
                      // Store the order update for later (after set completes)
                      const awsOrder = migratedSelections.map(item => item.instanceId);
                      updates._updateSessionOrder = awsOrder;
                      console.log('✅ [POLLING] Will update session state with AWS order:', awsOrder.length);
                    }
                  }
                }
              }
              
              // PHASE 1: OPERATION QUEUE POLLING
              // Fetch operations since last sync and apply them
              try {
                const lastSyncedVersion = currentState.lastSyncedVersion || 0;
                console.log('📥 [POLLING] Fetching operations since version:', lastSyncedVersion);
                
                const remoteOperations = await DatabaseService.getOperationsSince(userId, lastSyncedVersion);
                
                if (remoteOperations && remoteOperations.length > 0) {
                  console.log(`📥 [POLLING] Found ${remoteOperations.length} operations from AWS`);
                  
                  // Merge local and remote operations
                  const localOperations = currentState.operationQueue || [];
                  const mergedOps = mergeOperations(localOperations, remoteOperations);
                  
                  // Apply operations to state (use current browser ID for conflict resolution)
                  const browserId = getBrowserId();
                  let updatedState = currentState;
                  
                  // Apply remote operations (only those we haven't processed yet)
                  const remoteOpsToApply = remoteOperations.filter(op => op.timestamp > lastSyncedVersion);
                  
                  for (const op of remoteOpsToApply) {
                    updatedState = applyOperation(updatedState, op, browserId);
                  }
                  
                  // Update state if there were changes
                  if (remoteOpsToApply.length > 0) {
                    const newVersion = Math.max(...remoteOpsToApply.map(op => op.timestamp));
                    
                    set({
                      ...updatedState,
                      lastSyncedVersion: newVersion,
                    });
                    
                    // Save version to localStorage
                    try {
                      const keys = getProjectStorageKeys(userId, 'current');
                      localStorage.setItem(`${keys.selections}-last-synced-version`, newVersion.toString());
                      console.log(`✅ [POLLING] Applied ${remoteOpsToApply.length} operations, updated version to: ${newVersion}`);
                    } catch (err) {
                      console.warn('⚠️ Could not save last synced version:', err);
                    }
                  } else {
                    console.log('⏸️ [POLLING] No new operations to apply');
                  }
                } else {
                  console.log('⏸️ [POLLING] No operations found since version:', lastSyncedVersion);
                }
              } catch (opError) {
                console.error('❌ [POLLING] Error fetching/applying operations:', opError);
                // Don't throw - continue with other sync logic
              }
              
              if (awsInstanceMetadata && !skipAllSync) {
                // CRITICAL: Check if debounced save is still pending (3 seconds after typing)
                // If yes, skip this sync to avoid overwriting with old data
                if (instanceMetadataSaveTimeout) {
                  console.log('⏸️ [POLLING] Debounced save still pending, skipping sync to avoid conflict');
                } else {
                  // Safe to sync - no pending saves
                  const currentKeys = Object.keys(currentState.instanceMetadata);
                  const awsKeys = Object.keys(awsInstanceMetadata);
                  const allKeys = new Set([...currentKeys, ...awsKeys]);
                  
                  mergedInstanceMetadata = {};
                  hasNewerData = false;
                  
                  // CRITICAL FIX: Smart merge - use AWS data for sync, but protect recent local changes
                  // Check if there's a pending save (user just typed)
                  const pendingSave = instanceMetadataSaveTimeout !== null;
                  
                  for (const key of allKeys) {
                    const currentValue = currentState.instanceMetadata[key];
                    const awsValue = awsInstanceMetadata[key];
                    
                    // If there's a pending save, protect local data to avoid overwriting recent typing
                    if (pendingSave && currentValue) {
                      console.log(`⏸️ [POLLING] Protecting local metadata for ${key} - save pending`);
                      mergedInstanceMetadata[key] = currentValue;
                    } else if (currentValue && awsValue) {
                      // Compare timestamps to determine which is newer
                      const currentTime = currentValue.lastModified || 0;
                      const awsTime = awsValue.lastModified || 0;
                      
                      if (awsTime > currentTime) {
                        // AWS data is newer, use it
                        mergedInstanceMetadata[key] = awsValue;
                        hasNewerData = true;
                        console.log(`✅ [POLLING] Using AWS data for ${key} (AWS is newer: ${awsTime} vs ${currentTime}) - cross-browser sync`);
                      } else {
                        // Local data is newer or same, keep it
                        mergedInstanceMetadata[key] = currentValue;
                        console.log(`⏸️ [POLLING] Keeping local data for ${key} (local is newer: ${currentTime} vs ${awsTime})`);
                      }
                    } else if (awsValue) {
                      // Only AWS has data, use it
                      mergedInstanceMetadata[key] = awsValue;
                      hasNewerData = true;
                      console.log(`✅ [POLLING] Using AWS data for ${key} - cross-browser sync`);
                    } else if (currentValue) {
                      // No AWS data, keep current local data
                      mergedInstanceMetadata[key] = currentValue;
                    }
                  }
                  
                  if (hasNewerData) {
                    updates.instanceMetadata = mergedInstanceMetadata;
                    console.log('✅ [POLLING] Merged instance metadata with newer AWS data');
                    syncedMetadata = true;
                  } else {
                    console.log('✅ [POLLING] AWS metadata is older or same, keeping local');
                  }
                }
              }
              
              // Check for sort preferences changes (INSIDE the try block so updates is in scope)
              if (result.project.sortPreferences) {
                const { defectSortDirection: awsDefectSort, sketchSortDirection: awsSketchSort } = result.project.sortPreferences;
                const currentDefectSort = state.defectSortDirection;
                const currentSketchSort = state.sketchSortDirection;
                
                console.log('🔍 [POLLING] Checking sort preferences:', {
                  aws: { defectSort: awsDefectSort, sketchSort: awsSketchSort },
                  local: { defectSort: currentDefectSort, sketchSort: currentSketchSort }
                });
                
                // Check timestamp to avoid reverting recent changes (within last 10 seconds)
                const now = Date.now();
                const lastSortChange = state.sessionState?.lastSortChangeTime || 0;
                const recentChange = (now - lastSortChange) < 10000; // 10 seconds
                
                console.log('🔍 [POLLING] Sort change protection:', { now, lastSortChange, recentChange });
                
                // Check if AWS has different sort preferences
                if (awsDefectSort !== null && awsDefectSort !== currentDefectSort && !recentChange) {
                  console.log('🔄 [POLLING] AWS has different defect sort direction:', { 
                    current: currentDefectSort, 
                    aws: awsDefectSort,
                    recentChange
                  });
                  
                  // Add to updates to be applied in the main set() call
                  updates.defectSortDirection = awsDefectSort;
                  console.log('✅ [POLLING] Defect sort direction will be synced from AWS:', awsDefectSort);
                } else if (recentChange) {
                  console.log('⏸️ [POLLING] Skipping sort sync - recent local change within 10 seconds');
                } else {
                  console.log('✅ [POLLING] Sort directions match or AWS is null');
                }
                
                if (awsSketchSort !== null && awsSketchSort !== currentSketchSort && !recentChange) {
                  console.log('🔄 [POLLING] AWS has different sketch sort direction:', { 
                    current: currentSketchSort, 
                    aws: awsSketchSort 
                  });
                  
                  // Add to updates to be applied in the main set() call
                  updates.sketchSortDirection = awsSketchSort;
                  console.log('✅ [POLLING] Sketch sort direction will be synced from AWS:', awsSketchSort);
                }
                
                // Also update session state with AWS sort preferences
                if (awsDefectSort !== null || awsSketchSort !== null) {
                  get().updateSessionState({
                    sortPreferences: {
                      defectSortDirection: awsDefectSort !== null ? awsDefectSort : currentDefectSort,
                      sketchSortDirection: awsSketchSort !== null ? awsSketchSort : currentSketchSort
                    }
                  });
                  console.log('✅ [POLLING] Updated session state sort preferences');
                }
              } else {
                console.log('⚠️ [POLLING] No sortPreferences in project data');
              }
              
              if (Object.keys(updates).length > 0) {
                // Extract the session order update and skip flag before set
                const updateSessionOrder = (updates as any)._updateSessionOrder;
                const skipSessionOrderUpdate = (updates as any)._skipSessionOrderUpdate;
                delete (updates as any)._updateSessionOrder;
                delete (updates as any)._skipSessionOrderUpdate;
                
                set(updates);
                
                // Update session state after set completes (only if not skipped)
                if (updateSessionOrder && !skipSessionOrderUpdate) {
                  get().updateSessionState({ selectedImageOrder: updateSessionOrder });
                  console.log('✅ [POLLING] Updated session state selectedImageOrder to match AWS:', updateSessionOrder.length);
                } else if (skipSessionOrderUpdate) {
                  console.log('⏸️ [POLLING] Skipping session state order update - preserving local order in no-sort mode');
                }
                
                // Also update localStorage using versioned format
                const keys = getProjectStorageKeys(userId, 'current');
                const projectId = generateStableProjectId(userId, 'current');
                
                // CRITICAL FIX: Only save to localStorage if we didn't skip the sync
                // Don't overwrite localStorage with old AWS data when local has more items
                if (!skipAllSync && selectedImages && selectedImages.length > 0) {
                  // Use the already-migrated-and-reordered selectedImages from updates.selectedImages if set
                  const selectionsToSave = updates.selectedImages || migrateSelectedImageIds(selectedImages, currentState.images);
                  if (selectionsToSave.length > 0 && currentState.selectedImages.length <= selectionsToSave.length) {
                    // Only save if local doesn't have more items
                    saveVersionedData(keys.selections, projectId, userId, selectionsToSave);
                  }
                }
                if (!skipAllSync && awsInstanceMetadata && hasNewerData && mergedInstanceMetadata) {
                  // Only save metadata if it was updated
                  saveVersionedData(`${keys.selections}-instance-metadata`, projectId, userId, mergedInstanceMetadata);
                }
                
                console.log('✅ [POLLING] Selected images and metadata synced from AWS');
              }
            }
          } catch (error) {
            console.error('❌ [POLLING] Error syncing selected images metadata:', error);
          }
          
          // Sync formData if different
          if (dataIsDifferent && Object.keys(awsFormData).length > 0) {
            console.log('✅ [POLLING] Found different form data on AWS (cross-browser sync)');
            
            // Use AWS formData directly (it's already complete and latest)
            set({ 
              formData: awsFormData as any,
              sessionState: {
                ...state.sessionState,
                formData: awsFormData as any,
                lastActiveTime: Date.now() // Use real timestamp, not hash-based
              }
            });
            
            console.log('✅ [POLLING] Form data synced from AWS:', awsFormData);
            
            // Also update localStorage
            try {
              const keys = getProjectStorageKeys(userId, 'current');
              localStorage.setItem(keys.formData, JSON.stringify(awsFormData));
            } catch (error) {
              console.warn('⚠️ Error updating localStorage from polling:', error);
            }
            
            // Show toast notification
            if (typeof toast !== 'undefined') {
              toast.success('Form data synced from cloud');
            }
          } else {
            if (syncedMetadata) {
              console.log('✅ [POLLING] Metadata synced, form data unchanged');
            } else {
              console.log('✅ [POLLING] Data is the same, no sync needed');
            }
          }
        }
      } catch (error) {
        console.error('❌ [POLLING] Error checking AWS:', error);
      }
    }, 5000); // Poll every 5 seconds
    
    // Store interval ID for potential cleanup (could be added to MetadataState if needed)
    console.log('✅ Polling started, interval ID:', pollInterval);
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
  saveSessionState: (overrideViewMode?: 'images' | 'bulk') => {
    const state = get();
    
    // Get userId for storage keys
    const userId = getUserId();
    
    const keys = getProjectStorageKeys(userId, 'current');
    
    const effectiveViewMode = overrideViewMode || state.viewMode;
    
    const sessionState = {
      lastActiveTab: effectiveViewMode,
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
      sortPreferences: state.sessionState?.sortPreferences || {
        defectSortDirection: state.defectSortDirection,
        sketchSortDirection: state.sketchSortDirection
      }, // Include sortPreferences
      lastSortChangeTime: state.sessionState?.lastSortChangeTime, // Preserve sort change timestamp
      bulkText: state.sessionState?.bulkText // CRITICAL: Preserve bulkText for persistence
    };

    console.log('💾 SAVING SESSION STATE:', {
      currentViewMode: state.viewMode,
      overrideViewMode,
      effectiveViewMode,
      lastActiveTab: sessionState.lastActiveTab,
      storageKey: `${keys.formData}-session-state`,
      fullSessionState: sessionState
    });

    try {
      localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(sessionState));
      console.log('✅ Session state saved successfully to localStorage');
      
      // Use debounced AWS save to reduce costs
      debouncedAWSSave(sessionState);
    } catch (error) {
      console.error('❌ Error saving session state:', error);
    }
  },

  forceSessionStateSave: async (overrideViewMode?: 'images' | 'bulk', sessionStateOverrides?: Partial<SessionState>) => {
    const state = get();
    
    // Get userId for storage keys
    const userId = getUserId();
    
    const keys = getProjectStorageKeys(userId, 'current');
    
    const effectiveViewMode = overrideViewMode || state.viewMode;
    
    // CRITICAL: Use overrides if provided, otherwise read from state
    // This prevents race conditions when called immediately after updateSessionState
    const bulkTextToUse = sessionStateOverrides?.bulkText ?? state.sessionState?.bulkText;
    
    const sessionState: SessionState = {
      lastActiveTab: effectiveViewMode,
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
      sortPreferences: state.sessionState?.sortPreferences || {
        defectSortDirection: state.defectSortDirection,
        sketchSortDirection: state.sketchSortDirection
      }, // Include sortPreferences
      lastSortChangeTime: state.sessionState?.lastSortChangeTime, // Preserve sort change timestamp
      bulkText: bulkTextToUse, // CRITICAL: Use override if provided to prevent race conditions
      // Apply any other overrides from sessionStateOverrides (spread after to allow overrides)
      ...(sessionStateOverrides || {})
    };

    console.log('💾 [FORCE SAVE] SAVING SESSION STATE:', {
      currentViewMode: state.viewMode,
      overrideViewMode,
      effectiveViewMode,
      lastActiveTab: sessionState.lastActiveTab,
      storageKey: `${keys.formData}-session-state`,
      bulkTextLength: sessionState.bulkText ? sessionState.bulkText.length : 0,
      bulkTextPreview: sessionState.bulkText ? sessionState.bulkText.substring(0, 50) + '...' : 'none',
      hasBulkText: !!sessionState.bulkText,
      fullSessionState: sessionState
    });

    try {
      localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(sessionState));
      console.log('✅ [FORCE SAVE] Session state saved successfully to localStorage', {
        bulkTextLength: sessionState.bulkText ? sessionState.bulkText.length : 0
      });
      
      // Force immediate AWS save for critical operations with complete formData
      const currentState = get();
      console.log('💾 [FORCE SAVE] About to save to AWS:', {
        bulkTextLength: sessionState.bulkText ? sessionState.bulkText.length : 0,
        bulkTextInSessionState: !!sessionState.bulkText
      });
      await forceAWSSave(sessionState, currentState.formData);
    } catch (error) {
      console.error('❌ [FORCE SAVE] Error saving session state:', error);
    }
  },

  restoreSessionState: async () => {
    // Get userId for storage keys
    const userId = getUserId();
    
    const keys = getProjectStorageKeys(userId, 'current');
    
    console.log('🔄 RESTORING SESSION STATE...');
    console.log('🔍 Looking for key:', `${keys.formData}-session-state`);
    
    try {
      const savedSession = localStorage.getItem(`${keys.formData}-session-state`);
      console.log('📖 Raw session data from localStorage:', savedSession);
      
      let sessionState = null;
      
      if (savedSession) {
        sessionState = JSON.parse(savedSession);
        console.log('📋 Parsed session state from localStorage:', sessionState);
      } else {
        // If no localStorage data, try to load from AWS
        console.log('🌐 No localStorage session data, checking AWS...');
        try {
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          
          if (user?.email) {
            console.log('☁️ Loading session state from AWS...');
            const { DatabaseService } = await import('../lib/services');
            const result = await DatabaseService.getProject(user.email, 'current');
            
            if (result.project?.sessionState) {
              sessionState = result.project.sessionState;
              console.log('📋 Loaded session state from AWS:', sessionState);
              
              // CRITICAL: Preserve bulkText from current sessionState when caching from AWS
              // This prevents losing bulkText that was saved locally but not yet synced to AWS
              const currentState = get();
              const mergedSessionState = {
                ...sessionState,
                ...(currentState.sessionState?.bulkText && !sessionState.bulkText 
                  ? { bulkText: currentState.sessionState.bulkText } 
                  : {})
              };
              
              if (currentState.sessionState?.bulkText && !sessionState.bulkText) {
                console.log('💾 Preserving bulkText when caching from AWS:', currentState.sessionState.bulkText.length, 'characters');
                sessionState = mergedSessionState; // Update sessionState for use below
              }
              
              // Save to localStorage for faster future access (with preserved bulkText)
              localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(mergedSessionState));
              console.log('💾 Cached session state to localStorage');
              
              // Also restore sort preferences if available
              if (result.project.sortPreferences) {
                const { defectSortDirection, sketchSortDirection } = result.project.sortPreferences;
                set({ defectSortDirection, sketchSortDirection });
                console.log('🔄 Restored sort preferences from AWS');
              }
            } else {
              console.log('⚠️ No session state found in AWS');
            }
          }
        } catch (error) {
          console.error('❌ Error loading session state from AWS:', error);
        }
      }
      
      if (sessionState) {
        console.log('📋 Using session state:', sessionState);
        
        // CRITICAL: Merge loaded sessionState with current sessionState to preserve fields like bulkText
        // This prevents losing bulkText when restoring from AWS/localStorage that might not have it yet
        const currentState = get();
        const mergedSessionState = {
          ...sessionState, // Loaded state takes priority
          // But preserve bulkText from current state if loaded state doesn't have it
          ...(currentState.sessionState?.bulkText && !sessionState.bulkText ? { bulkText: currentState.sessionState.bulkText } : {})
        };
        
        if (currentState.sessionState?.bulkText && !sessionState.bulkText) {
          console.log('💾 Preserving existing bulkText during restore:', currentState.sessionState.bulkText.length, 'characters');
        }
        
        // Use mergedSessionState for all subsequent operations
        sessionState = mergedSessionState;
        
        // Update the session state with merged data
        set({ sessionState: mergedSessionState });
        
          // Restore sort preferences from session state
        if (sessionState.sortPreferences) {
          const { defectSortDirection, sketchSortDirection } = sessionState.sortPreferences;
          // Only update if sort preferences are not null
          if (defectSortDirection !== null || sketchSortDirection !== null) {
            set({ defectSortDirection, sketchSortDirection });
            console.log('🔄 Restored sort preferences from session state:', {
              defectSortDirection,
              sketchSortDirection
            });
          } else {
            console.log('⚠️ Session state sort preferences are null, preserving local state');
          }
        } else {
          console.log('⚠️ No sortPreferences found in session state');
          console.log('📋 Available session state keys:', Object.keys(sessionState));
        }
        
        // Restore view mode
        if (sessionState.lastActiveTab) {
          console.log('🎯 RESTORING VIEW MODE:', {
            from: get().viewMode,
            to: sessionState.lastActiveTab
          });
          set({ viewMode: sessionState.lastActiveTab });
          
          // Verify the restore worked
          const currentViewMode = get().viewMode;
          console.log('✅ View mode restored to:', sessionState.lastActiveTab);
          console.log('🔍 Current viewMode after restore:', currentViewMode);
          
          if (currentViewMode !== sessionState.lastActiveTab) {
            console.error('❌ VIEW MODE RESTORE FAILED!', {
              expected: sessionState.lastActiveTab,
              actual: currentViewMode
            });
          }
        } else {
          console.log('⚠️ No lastActiveTab found in session state');
        }
        
        // Restore formData from session state with merging logic
        // Merge to preserve existing date, elr, and structureNo fields
        // currentState already declared above, reuse it
        
        if (sessionState.formData) {
          console.log('📋 Session state form data:', sessionState.formData);
          console.log('📋 Current form data:', currentState.formData);
          
          // Standardize and merge form data
          let mergedFormData = { ...currentState.formData };
          
          if (sessionState.formData.date) {
            const standardizedDate = standardizeDate(sessionState.formData.date);
            mergedFormData.date = standardizedDate;
            console.log('📅 Restored date:', standardizedDate);
          }
          
          // Merge elr, structureNo, and other fields
          if (sessionState.formData.elr) {
            mergedFormData.elr = sessionState.formData.elr;
            console.log('📝 Restored elr:', sessionState.formData.elr);
          }
          
          if (sessionState.formData.structureNo) {
            mergedFormData.structureNo = sessionState.formData.structureNo;
            console.log('📝 Restored structureNo:', sessionState.formData.structureNo);
          }
          
          // Merge any additional fields
          Object.keys(sessionState.formData).forEach(key => {
            if (key !== 'date' && key !== 'elr' && key !== 'structureNo' && sessionState.formData[key]) {
              mergedFormData[key as keyof typeof mergedFormData] = sessionState.formData[key];
              console.log(`📝 Restored ${key}:`, sessionState.formData[key]);
            }
          });
          
          set({ formData: mergedFormData });
          console.log('✅ Form data merged and restored:', mergedFormData);
        } else {
          console.log('⚠️ No form data available in session state');
        }
        
        // Restore bulk defects order if available and no bulk defects are currently loaded
        if (sessionState.bulkDefectOrder && sessionState.bulkDefectOrder.length > 0 && 
            (!currentState.bulkDefects || currentState.bulkDefects.length === 0)) {
          console.log('🔄 Attempting to restore bulk defects from session state...');
          // This will be handled by loadBulkData which checks session state
        }
        
        // Restore selected images order if available (but NOT in no-sort mode)
        // In no-sort mode, preserve current insertion order, don't restore from saved state
        if (sessionState.selectedImageOrder && sessionState.selectedImageOrder.length > 0) {
          const currentSortMode = currentState.defectSortDirection;
          
          if (currentSortMode === null) {
            // No-sort mode: Don't restore order, preserve current insertion order
            console.log('⏸️ No-sort mode: Skipping order restoration to preserve insertion order');
          } else {
            // Sorted mode: Restore order from session state
          console.log('🔄 Restoring selected images order from session state:', sessionState.selectedImageOrder);
          
          const currentSelectedImages = currentState.selectedImages;
          console.log('🔄 Current selectedImages before restoration:', currentSelectedImages);
          
          if (currentSelectedImages && currentSelectedImages.length > 0) {
            // Create a map for quick lookup
            const selectedImageMap = new Map(currentSelectedImages.map(item => [item.instanceId, item]));
            console.log('🔄 SelectedImageMap keys:', Array.from(selectedImageMap.keys()));
            
            // Reorder selected images according to saved order
            const reorderedSelectedImages = sessionState.selectedImageOrder
              .map(instanceId => selectedImageMap.get(instanceId))
              .filter(Boolean) as Array<{ id: string; instanceId: string }>;
            
            // Add any selected images not in the saved order at the end
            const remainingSelectedImages = currentSelectedImages.filter(item => 
              !sessionState.selectedImageOrder.includes(item.instanceId)
            );
            
            const finalSelectedImages = [...reorderedSelectedImages, ...remainingSelectedImages];
            set({ selectedImages: finalSelectedImages });
            console.log('✅ Selected images order restored:', finalSelectedImages.length);
          } else {
            console.log('⚠️ No current selectedImages to restore order for');
            }
          }
        } else {
          console.log('⚠️ No selectedImageOrder in session state');
        }
        
        // Restore image order if available
        if (sessionState.imageOrder && sessionState.imageOrder.length > 0) {
          console.log('🔄 Restoring image order from session state:', sessionState.imageOrder);
          
          const currentImages = currentState.images;
          if (currentImages && currentImages.length > 0) {
            // Create a map for quick lookup
            const imageMap = new Map(currentImages.map(img => [img.id, img]));
            
            // Reorder images according to saved order
            const reorderedImages = sessionState.imageOrder
              .map(id => imageMap.get(id))
              .filter(Boolean) as ImageMetadata[];
            
            // Add any images not in the saved order at the end
            const remainingImages = currentImages.filter(img => 
              !sessionState.imageOrder.includes(img.id)
            );
            
            const finalImages = [...reorderedImages, ...remainingImages];
            set({ images: finalImages });
            console.log('✅ Image order restored:', finalImages.length);
          }
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
    
    // Get userId for storage keys
    const userId = getUserId();
    
    // Automatically capture current orders when updating session state
    // BUT: If updates explicitly provides selectedImageOrder, use it (don't override)
    // CRITICAL: Preserve bulkText from existing sessionState if not explicitly updated
    const autoUpdates = {
      ...updates,
      imageOrder: updates.imageOrder || state.images.map(img => img.id),
      selectedImageOrder: updates.selectedImageOrder || state.selectedImages.map(item => item.instanceId),
      bulkDefectOrder: updates.bulkDefectOrder || state.bulkDefects.map(defect => defect.id || defect.photoNumber),
      lastActiveTime: Date.now()
    };
    
    // Preserve bulkText if it exists in current sessionState and not being explicitly updated/cleared
    if (state.sessionState.bulkText !== undefined && updates.bulkText === undefined) {
      autoUpdates.bulkText = state.sessionState.bulkText;
    }
    
    const newSessionState = { ...state.sessionState, ...autoUpdates };
    set({ sessionState: newSessionState });
    
    console.log('🔄 Updated session state with current orders:', {
      imageCount: autoUpdates.imageOrder.length,
      selectedCount: autoUpdates.selectedImageOrder.length,
      bulkCount: autoUpdates.bulkDefectOrder.length,
      bulkTextLength: newSessionState.bulkText ? newSessionState.bulkText.length : 0,
      updates: updates
    });
    
    // Auto-save session state when updated
    const keys = getProjectStorageKeys(userId, 'current');
    try {
      localStorage.setItem(`${keys.formData}-session-state`, JSON.stringify(newSessionState));
      console.log('💾 Session state saved to localStorage with current orders');
      
      // Use debounced AWS save to reduce costs
      debouncedAWSSave(newSessionState);
    } catch (error) {
      console.error('Error updating session state:', error);
    }
  },

  clearSessionState: () => {
    // Get userId for storage keys
    const userId = getUserId();
    
    const keys = getProjectStorageKeys(userId, 'current');
    try {
      localStorage.removeItem(`${keys.formData}-session-state`);
    } catch (error) {
      console.error('Error clearing session state:', error);
    }
  },
}));// Force deployment
