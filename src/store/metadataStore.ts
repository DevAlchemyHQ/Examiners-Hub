import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StorageService } from '../lib/services';
import { ImageMetadata, FormData, BulkDefect } from '../types';
import { createZipFile } from '../utils/zipUtils';
import { nanoid } from 'nanoid';

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
};

export const useMetadataStore = create<MetadataState>((set, get) => ({
  ...initialState,

  setFormData: (data) => {
    set((state) => ({
      formData: { ...state.formData, ...data },
    }));
    // For local testing, save to localStorage
    const state = get();
    localStorage.setItem('clean-app-form-data', JSON.stringify(state.formData));
  },

  addImages: async (files, isSketch = false) => {
    try {
      console.log('addImages called with', files.length, 'files');
      
      // Upload files to S3 and create image metadata
      const newImages: ImageMetadata[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`Processing file ${i + 1}/${files.length}:`, file.name);
        
        // Create unique file path
        const timestamp = Date.now();
        const filePath = `images/${timestamp}-${file.name}`;
        
        // Upload to S3 using StorageService
        const uploadResult = await StorageService.uploadFile(file, filePath);
        
        if (uploadResult.error) {
          console.error('Upload failed for', file.name, uploadResult.error);
          throw new Error(`Failed to upload ${file.name}: ${uploadResult.error}`);
        }
        
        const imageMetadata: ImageMetadata = {
          id: crypto.randomUUID(),
          file,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          photoNumber: '',
          description: '',
          preview: URL.createObjectURL(file), // Local preview
          isSketch,
          publicUrl: uploadResult.url!, // S3 signed URL
          userId: 'local-user',
          uploadTimestamp: timestamp
        };
        
        newImages.push(imageMetadata);
        console.log(`✅ Uploaded ${file.name} to S3`);
      }

      console.log('All files uploaded to S3, updating state...');
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
          // No sort direction, just add to the end
          newSelected.add(id);
        }
      }
      
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
    set((state) => ({
      bulkDefects: typeof defects === 'function' ? defects(state.bulkDefects) : defects,
    }));
  },

  reset: () => {
    set(initialState);
    // Clear localStorage for local testing
    localStorage.removeItem('clean-app-images');
    localStorage.removeItem('clean-app-form-data');
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
      // For local testing, load from localStorage
      const savedFormData = localStorage.getItem('clean-app-form-data');

      // Don't load images from localStorage - they need to be re-uploaded
      set({ images: [] });
      
      if (savedFormData) {
        const formData = JSON.parse(savedFormData);
        set({ formData });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },

  saveUserData: async () => {
    try {
      const state = get();
      // Only save form data, not images
      localStorage.setItem('clean-app-form-data', JSON.stringify(state.formData));
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
      // For local testing, save to localStorage
      localStorage.setItem('clean-app-bulk-data', JSON.stringify(state.bulkDefects));
    } catch (error) {
      console.error('Error saving bulk data:', error);
    }
  },

  loadBulkData: async () => {
    try {
      // For local testing, load from localStorage
      const savedBulkData = localStorage.getItem('clean-app-bulk-data');
      
      if (savedBulkData) {
        const bulkDefects = JSON.parse(savedBulkData);
        set({ bulkDefects });
      }
    } catch (error) {
      console.error('Error loading bulk data:', error);
    }
  },

  generateBulkZip: async () => {
    try {
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

      // Get the actual image metadata for selected files
      const selectedImageMetadata = defectsWithImages.map(defect => {
        const image = images.find(img => img.file.name === defect.selectedFile);
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
        const image = images.find(img => img.file.name === defect.selectedFile);
        if (!image) {
          throw new Error(`Image not found for defect ${defect.photoNumber || 'unknown'}`);
        }
        
        return `Photo ${defect.photoNumber?.padStart(2, '0') || '00'} ^ ${defect.description || ''} ^ ${formData.date || new Date().toISOString().slice(0,10)}    ${defect.selectedFile}`;
      }).join('\n');

      // Generate filenames
      const metadataFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.txt`;
      const zipFileName = `${formData.elr?.trim().toUpperCase() || 'ELR'}_${formData.structureNo?.trim() || 'STRUCT'}_bulk_defects.zip`;

      // Create ZIP file with metadata and processed images
      const zipBlob = await createZipFile(
        selectedImageMetadata,
        metadataFileName,
        metadataContent,
        formData.date || new Date().toISOString().slice(0,10),
        zipFileName
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Bulk defects downloaded successfully');
    } catch (error) {
      console.error('Error generating bulk zip:', error);
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