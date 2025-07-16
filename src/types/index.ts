export interface ImageMetadata {
  id: string;
  file: File;
  fileName: string;
  fileSize: number;
  fileType: string;
  photoNumber: string;
  description: string;
  preview: string;
  isSketch?: boolean;
  publicUrl?: string;
  userId?: string;
  uploadTimestamp?: number;
}

export interface FormData {
  elr: string;
  structureNo: string;
  date: string;
}

export interface BulkDefect {
  id?: string;
  photoNumber: string;
  description: string;
  selectedFile: string;
  originalPhotoNumber?: string;
}