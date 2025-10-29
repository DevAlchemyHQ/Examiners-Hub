/**
 * Operation Merge and Conflict Resolution
 * 
 * Handles merging operations from multiple sources (local queue vs remote operations)
 * and applying operations to state. Implements deterministic conflict resolution rules.
 * 
 * Conflict Resolution Rules:
 * 1. DELETE always wins (prevents deleted items from reappearing)
 * 2. Local operations < 5 seconds old are protected (user actively editing)
 * 3. Last writer wins for metadata (newer timestamp wins)
 * 4. Additions merge (no conflicts)
 * 
 * @see SYNC_ARCHITECTURE_PLAN.md for full rules
 */

import { Operation, OperationQueue } from '../types/operations';
import { MetadataStateOnly } from '../store/metadataStore';

/**
 * Apply a single operation to state
 * 
 * @param state Current state
 * @param op Operation to apply
 * @param currentBrowserId Browser ID for conflict resolution
 * @returns New state with operation applied
 */
export function applyOperation(
  state: MetadataStateOnly,
  op: Operation,
  currentBrowserId?: string
): MetadataStateOnly {
  switch (op.type) {
    case 'ADD_SELECTION':
      // Only add if doesn't exist
      if (
        !state.selectedImages.find((item) => item.instanceId === op.instanceId)
      ) {
        // Find image to get fileName
        const image = state.images.find((img) => img.id === op.imageId);
        const fileName = image?.fileName || image?.file?.name || op.fileName || 'unknown';

        const newItem = {
          id: op.imageId!,
          instanceId: op.instanceId!,
          fileName,
        };

        // Respect sort direction when adding:
        // - Descending: add to START (new items appear first)
        // - Ascending/No sort: add to END (new items appear last)
        const sortDir = state.defectSortDirection;
        const newSelectedImages = sortDir === 'desc' 
          ? [newItem, ...state.selectedImages]
          : [...state.selectedImages, newItem];

        return {
          ...state,
          selectedImages: newSelectedImages,
        };
      }
      return state;

    case 'DELETE_SELECTION':
      return {
        ...state,
        selectedImages: state.selectedImages.filter(
          (item) => item.instanceId !== op.instanceId
        ),
      };

    case 'UPDATE_METADATA':
      // Check if local is newer (protect recent edits)
      const localMeta = state.instanceMetadata[op.instanceId!];
      const isLocalNewer =
        localMeta?.lastModified &&
        localMeta.lastModified > op.timestamp &&
        currentBrowserId === op.browserId; // Only protect if from same browser

      if (isLocalNewer && Date.now() - localMeta.lastModified! < 5000) {
        // Keep local (user is actively editing, operation is < 5 seconds old)
        console.log(
          `⏸️ Keeping local metadata (newer): ${op.instanceId}`,
          localMeta.lastModified,
          'vs',
          op.timestamp
        );
        return state;
      }

      // Apply remote update
      return {
        ...state,
        instanceMetadata: {
          ...state.instanceMetadata,
          [op.instanceId!]: {
            ...localMeta,
            ...op.data,
            lastModified: op.timestamp,
          },
        },
      };

    case 'SORT_CHANGE':
      const sortDir = op.data?.sortDirection as 'asc' | 'desc' | null;
      if (sortDir !== undefined && sortDir !== null) {
        return {
          ...state,
          defectSortDirection: sortDir,
        };
      }
      return state;

    default:
      console.warn('⚠️ Unknown operation type:', (op as any).type);
      return state;
  }
}

/**
 * Merge local and remote operations
 * Removes duplicates and sorts by timestamp
 * 
 * @param localOps Local operation queue
 * @param remoteOps Operations from server
 * @returns Merged, deduplicated operations
 */
export function mergeOperations(
  localOps: Operation[],
  remoteOps: Operation[]
): Operation[] {
  // Combine all operations
  const allOps = [...localOps, ...remoteOps];

  // Remove duplicates (same operation ID)
  const seen = new Set<string>();
  const unique = allOps.filter((op) => {
    if (seen.has(op.id)) {
      console.log('🔍 Duplicate operation detected:', op.id);
      return false;
    }
    seen.add(op.id);
    return true;
  });

  // Sort by timestamp
  unique.sort((a, b) => a.timestamp - b.timestamp);

  return unique;
}

/**
 * Apply conflict resolution rules to merged operations
 * This is Phase 2 functionality but we implement basic rules here
 * 
 * @param operations Merged operations
 * @param currentBrowserId Current browser ID
 * @returns Operations with conflicts resolved
 */
export function resolveConflicts(
  operations: Operation[],
  currentBrowserId: string
): Operation[] {
  const resolved: Operation[] = [];
  const processedInstanceIds = new Set<string>();

  // Process in reverse (newest first) so deletions take precedence
  const reversed = [...operations].reverse();

  for (const op of reversed) {
    if (op.type === 'DELETE_SELECTION' && op.instanceId) {
      // DELETE always wins - remove any conflicting operations
      resolved.unshift(op); // Add at beginning (we're iterating backwards)
      processedInstanceIds.add(op.instanceId);

      // Remove conflicting operations already in resolved
      const conflictingIndex = resolved.findIndex(
        (r) =>
          r.instanceId === op.instanceId &&
          r.type !== 'DELETE_SELECTION' &&
          r.id !== op.id
      );
      if (conflictingIndex >= 0) {
        resolved.splice(conflictingIndex, 1);
        console.log(
          `🔧 Removed conflicting operation: ${op.instanceId}`,
          resolved[conflictingIndex]
        );
      }
    } else if (op.type === 'UPDATE_METADATA' && op.instanceId) {
      // For UPDATE: Keep newer or local if recent
      const existing = resolved.find(
        (r) => r.instanceId === op.instanceId && r.type === 'UPDATE_METADATA'
      );

      if (!existing) {
        resolved.unshift(op);
      } else {
        // Conflict: pick winner
        const isLocal = op.browserId === currentBrowserId;
        const isRecentLocal =
          isLocal && Date.now() - op.timestamp < 5000;

        if (isRecentLocal || op.timestamp > existing.timestamp) {
          // Replace existing with newer/local
          const index = resolved.indexOf(existing);
          resolved[index] = op;
          console.log(
            `🔧 Resolved UPDATE conflict: ${op.instanceId}`,
            isRecentLocal ? '(local recent)' : '(newer timestamp)'
          );
        }
      }
    } else {
      // ADD and SORT_CHANGE: No conflicts, always add
      if (!processedInstanceIds.has(op.instanceId || '')) {
        resolved.unshift(op);
      }
    }
  }

  // Reverse back to chronological order
  return resolved.reverse();
}

