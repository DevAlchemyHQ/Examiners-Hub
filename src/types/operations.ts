/**
 * Operation Queue System for Sync Architecture
 * 
 * Operations represent user intentions (commands) rather than final state.
 * This allows for conflict-free merging and deterministic sync behavior.
 * 
 * @see SYNC_ARCHITECTURE_PLAN.md for full architecture details
 */

export interface Operation {
  /** Unique operation ID: `${timestamp}-${browserId}-${random}` */
  id: string;
  
  /** Operation type */
  type:
    | "ADD_SELECTION"
    | "DELETE_SELECTION"
    | "UPDATE_METADATA"
    | "SORT_CHANGE";
  
  /** Instance ID for DELETE and UPDATE operations */
  instanceId?: string;
  
  /** Image ID for ADD operations */
  imageId?: string;
  
  /** Operation data (varies by type) */
  data?: {
    /** Photo number (for UPDATE_METADATA) */
    photoNumber?: string;
    /** Description (for UPDATE_METADATA) */
    description?: string;
    /** Sort direction (for SORT_CHANGE) */
    sortDirection?: "asc" | "desc" | null;
  };
  
  /** Timestamp when operation occurred (milliseconds since epoch) */
  timestamp: number;
  
  /** Unique browser identifier (persisted in localStorage) */
  browserId: string;
  
  /** Optional: File name for ADD operations (for cross-session matching) */
  fileName?: string;
}

export type OperationQueue = Operation[];

/**
 * Operation sync result from server
 */
export interface OperationSyncResult {
  /** Success flag */
  success: boolean;
  /** Last processed operation version/timestamp */
  lastVersion: number;
  /** Number of operations processed */
  processedCount: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Helper to create operation ID
 */
export function createOperationId(browserId: string): string {
  return `${Date.now()}-${browserId}-${Math.random().toString(36).substring(2, 9)}`;
}

