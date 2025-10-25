// src/utils/idGenerator.ts
/**
 * Generate deterministic, cross-browser-safe IDs.
 * Uses user email + project name to make a stable hash.
 */

// Browser-compatible hash function (since crypto.createHash is Node.js only)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Generate stable, deterministic project ID
 * Same user + same project = same ID across all browsers/devices
 */
export function generateStableProjectId(userEmail: string, projectName: string = 'current'): string {
  const normalized = `${userEmail.toLowerCase().trim()}::${projectName.trim()}`;
  const hash = simpleHash(normalized);
  return `proj_${hash}`;
}

/**
 * Generate stable, deterministic session ID
 * Based on user + project + session type
 */
export function generateStableSessionId(userEmail: string, projectName: string = 'current', sessionType: string = 'main'): string {
  const normalized = `${userEmail.toLowerCase().trim()}::${projectName.trim()}::${sessionType}`;
  const hash = simpleHash(normalized);
  return `sess_${hash}`;
}

/**
 * Generate stable, deterministic image ID
 * Based on user + project + filename + upload order
 */
export function generateStableImageId(userEmail: string, projectName: string, fileName: string, uploadOrder: number = 0): string {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '-');
  const normalized = `${userEmail.toLowerCase().trim()}::${projectName.trim()}::${cleanFileName}::${uploadOrder}`;
  const hash = simpleHash(normalized);
  return `img_${hash}`;
}

/**
 * Generate stable, deterministic storage key
 * Consistent pattern across all storage types
 */
export function generateStorageKey(userEmail: string, projectName: string, dataType: string): string {
  const projectId = generateStableProjectId(userEmail, projectName);
  return `project_${projectId}_${dataType}`;
}

/**
 * Get all storage keys for a project
 */
export function getAllProjectStorageKeys(userEmail: string, projectName: string = 'current') {
  const projectId = generateStableProjectId(userEmail, projectName);
  return {
    formData: `project_${projectId}_formData`,
    images: `project_${projectId}_images`,
    selections: `project_${projectId}_selections`,
    bulkData: `project_${projectId}_bulkData`,
    sessionState: `project_${projectId}_sessionState`,
    instanceMetadata: `project_${projectId}_instanceMetadata`,
    sortPreferences: `project_${projectId}_sortPreferences`
  };
}

/**
 * Versioned data structure for persistence
 */
export interface VersionedData<T> {
  version: number;
  timestamp: number;
  projectId: string;
  userId: string;
  data: T;
}

export const PERSISTENCE_VERSION = 2;

/**
 * Save versioned data to localStorage
 */
export function saveVersionedData<T>(key: string, projectId: string, userId: string, data: T): void {
  const versionedData: VersionedData<T> = {
    version: PERSISTENCE_VERSION,
    timestamp: Date.now(),
    projectId,
    userId,
    data
  };
  
  try {
    localStorage.setItem(key, JSON.stringify(versionedData));
    console.log(`✅ Versioned data saved: ${key} (v${PERSISTENCE_VERSION})`);
  } catch (error) {
    console.error(`❌ Error saving versioned data ${key}:`, error);
  }
}

/**
 * Load versioned data from localStorage
 */
export function loadVersionedData<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const versionedData: VersionedData<T> = JSON.parse(stored);
    
    // Check version compatibility
    if (versionedData.version !== PERSISTENCE_VERSION) {
      console.warn(`⚠️ Version mismatch for ${key}: stored v${versionedData.version}, expected v${PERSISTENCE_VERSION}`);
      // Could implement migration logic here
    }
    
    console.log(`✅ Versioned data loaded: ${key} (v${versionedData.version})`);
    return versionedData.data;
  } catch (error) {
    console.error(`❌ Error loading versioned data ${key}:`, error);
    return null;
  }
}
