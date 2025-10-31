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
  publicUrl?: string;
  userId?: string;
  uploadTimestamp?: number;
  base64?: string; // For localStorage storage
  s3Key?: string; // Store S3 key for downloads
  instanceId?: string; // For selected image instances
}

export interface FormData {
  elr: string;
  structureNo: string;
  date: string;
}

// Source tracking types for sync-aware updates
export type DataSource = 'localStorage' | 'aws' | 'local-edit' | 'operation';

export interface FormDataWithSource {
  data: FormData;
  source: DataSource;
  timestamp: number;
  syncVersion: number;
  lastSyncedAt: number;
}

export interface LoadContext {
  phase: 'initial-load' | 'sync' | 'operation-replay';
  source: DataSource;
  isFirstRender: boolean;
}

export interface SyncState {
  lastSyncAttempt: number;
  lastSuccessfulSync: number;
  syncInProgress: boolean;
}

export interface BulkDefect {
  id?: string;
  photoNumber: string;
  description: string;
  selectedFile: string;
  originalPhotoNumber?: string;
  severity?: string;
}