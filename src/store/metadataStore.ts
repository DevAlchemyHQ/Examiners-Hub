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
    set((state) => {
      const newFormData = { ...state.formData, ...data };
      
      // Auto-save to localStorage immediately
      localStorage.setItem('clean-app-form-data', JSON.stringify(newFormData));
      
      // Auto-save to AWS in background
      (async () => {
        try {
          const { AuthService } = await import('../lib/services');
          const { user } = await AuthService.getCurrentUser();
          
          if (user?.email) {
            const { DatabaseService } = await import('../lib/services');
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
            const imageMetadata: ImageMetadata = {
              id: crypto.randomUUID(),
              file: file, // Keep the original file for new uploads
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type,
              photoNumber: '',
              description: '',
              preview: URL.createObjectURL(file), // Local preview for new uploads
              isSketch,
              publicUrl: uploadResult.url!, // S3 signed URL
              userId: userId // Use actual user ID
            };
            
            newImages.push(imageMetadata);
            console.log(`✅ Uploaded ${file.name} to S3 for user ${userId}`);
          }
        } catch (error) {
          console.error('Error processing file:', file.name, error);
          throw error; // Re-throw to stop the process
        }
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
          return (a.fileName || a.file?.name || '').localeCompare(b.fileName || b.file?.name || '');
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
      
      // Auto-save images to AWS in background
      (async () => {
        try {
          const { AuthService } = await import('../lib/services');
          const { user } = await AuthService.getCurrentUser();
          
          if (user?.email) {
            const { DatabaseService } = await import('../lib/services');
            await DatabaseService.updateProject(user.email, 'current', { images: updatedImages });
            console.log('✅ Images auto-saved to AWS for user:', user.email);
          }
        } catch (error) {
          console.error('❌ Error auto-saving images:', error);
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
    set((state) => {
      const newBulkDefects = typeof defects === 'function' ? defects(state.bulkDefects) : defects;
      
      // Auto-save to localStorage immediately
      localStorage.setItem('clean-app-bulk-data', JSON.stringify(newBulkDefects));
      
      // Auto-save to AWS in background
      (async () => {
        try {
          const { AuthService } = await import('../lib/services');
          const { user } = await AuthService.getCurrentUser();
          
          if (user?.email) {
            const { DatabaseService } = await import('../lib/services');
            await DatabaseService.updateBulkDefects(user.email, newBulkDefects);
            console.log('✅ Bulk defects auto-saved to AWS for user:', user.email);
          } else {
            console.log('No user found, skipping AWS save');
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
      console.log('Loading user data...');
      
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.email || localStorage.getItem('userEmail') || 'anonymous';
      
      console.log('Loading data for user:', userId);
      
      // Load form data from AWS first, then fallback to localStorage
      if (userId !== 'anonymous') {
        try {
          const { DatabaseService } = await import('../lib/services');
          const { project } = await DatabaseService.getProject(userId, 'current');
          
          if (project?.formData) {
            set({ formData: project.formData });
            console.log('✅ Form data loaded from AWS for user:', userId);
          } else {
            // Fallback to localStorage
            const savedFormData = localStorage.getItem('clean-app-form-data');
            if (savedFormData) {
              const formData = JSON.parse(savedFormData);
              set({ formData });
              console.log('📱 Form data loaded from localStorage (fallback)');
            }
          }
        } catch (error) {
          console.error('❌ Error loading form data from AWS:', error);
          // Fallback to localStorage
          const savedFormData = localStorage.getItem('clean-app-form-data');
          if (savedFormData) {
            const formData = JSON.parse(savedFormData);
            set({ formData });
            console.log('📱 Form data loaded from localStorage (fallback)');
          }
        }
      } else {
        // Anonymous user - load from localStorage
        const savedFormData = localStorage.getItem('clean-app-form-data');
        if (savedFormData) {
          const formData = JSON.parse(savedFormData);
          set({ formData });
          console.log('📱 Form data loaded from localStorage (anonymous user)');
        }
      }
      
      // Load images from S3 for the user
      if (userId !== 'anonymous') {
        try {
          console.log('Loading images from S3 for user:', userId);
          
          // List files in user's S3 folder
          const { files, error } = await StorageService.listFiles(`users/${userId}/images/`);
          
          if (error) {
            console.error('Error listing S3 files:', error);
            set({ images: [] });
            return;
          }
          
          if (files && files.length > 0) {
            console.log('Found', files.length, 'images in S3');
            
            // Create image metadata for each file using real S3 URLs
            const loadedImages: ImageMetadata[] = [];
            
            for (const file of files) {
              try {
                // Extract original filename from S3 path (remove timestamp prefix)
                const originalFileName = file.name.split('-').slice(1).join('-'); // Remove timestamp prefix
                
                // Create image metadata with real S3 URL
                const imageMetadata: ImageMetadata = {
                  id: crypto.randomUUID(),
                  fileName: originalFileName,
                  fileSize: file.size,
                  fileType: 'image/jpeg', // Default type
                  photoNumber: '',
                  description: '',
                  preview: file.url, // Use signed URL for preview
                  isSketch: false,
                  publicUrl: file.url, // Use signed URL for public access
                  userId: userId
                };
                
                loadedImages.push(imageMetadata);
              } catch (error) {
                console.error('Error processing S3 file:', file.name, error);
              }
            }
            
            set({ images: loadedImages });
            console.log('✅ Images loaded from S3 for user:', userId);
          } else {
            console.log('No images found in S3 for user:', userId);
            set({ images: [] });
          }
        } catch (error) {
          console.error('Error loading images from S3:', error);
          set({ images: [] });
        }
      }
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  },

  saveUserData: async () => {
    try {
      const state = get();
      const { formData } = state;
      
      // Save to localStorage for immediate access
      localStorage.setItem('clean-app-form-data', JSON.stringify(formData));
      
      // Save to AWS DynamoDB for cross-device persistence
      const { AuthService } = await import('../lib/services');
      const { user } = await AuthService.getCurrentUser();
      
      if (user?.email) {
        const { DatabaseService } = await import('../lib/services');
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
      const { AuthService } = await import('../lib/services');
      const { user } = await AuthService.getCurrentUser();
      
      if (user?.email) {
        const { DatabaseService } = await import('../lib/services');
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
      
      // First try AWS
      const { AuthService } = await import('../lib/services');
      const { user } = await AuthService.getCurrentUser();
      
      if (user?.email) {
        try {
          const { DatabaseService } = await import('../lib/services');
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
      console.error('❌ Error loading bulk data:', error);
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

      // Get the actual image metadata for selected files
      const selectedImageMetadata = defectsWithImages.map(defect => {
        const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
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
        const image = images.find(img => (img.fileName || img.file?.name || '') === defect.selectedFile);
        if (!image) {
          throw new Error(`Image not found for defect ${defect.photoNumber || 'unknown'}`);
        }
        
        return `Photo ${defect.photoNumber?.padStart(2, '0') || '00'} ^ ${defect.description || ''} ^ ${formData.date || new Date().toISOString().slice(0,10)}    ${defect.selectedFile}`;
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