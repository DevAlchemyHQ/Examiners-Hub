export interface ImageMetadata {
  id: string;
  file?: File; // Make file optional for S3-loaded images
  fileName?: string; // Add fileName for S3-loaded images
  fileSize?: number;
  fileType?: string;
  photoNumber: string;
  description: string;
  preview: string;
  isSketch?: boolean;
  publicUrl: string;
  userId: string;
  uploadTimestamp?: number;
  base64?: string; // For localStorage storage
  s3Key?: string; // Store S3 key for downloads
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
} 