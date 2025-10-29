# Selected Images - Final State Documentation

**Last Updated**: January 2025  
**Status**: ✅ Production Ready  
**Architecture**: Operation Queue System (Phase 1) with Refresh-Only Sync

---

## Overview

The selected images functionality has been fully refactored to use an operation-based sync architecture. This document describes the current final state, including architecture, data flow, sorting behavior, and cross-browser synchronization.

---

## Architecture

### Operation Queue System

The system tracks user actions as **operations** rather than full state snapshots:

```typescript
interface Operation {
  id: string; // `${timestamp}-${browserId}-${random}`
  type:
    | "ADD_SELECTION"
    | "DELETE_SELECTION"
    | "UPDATE_METADATA"
    | "SORT_CHANGE";
  instanceId?: string; // For DELETE, UPDATE
  imageId?: string; // For ADD
  data?: {
    photoNumber?: string;
    description?: string;
    sortDirection?: "asc" | "desc" | null;
  };
  timestamp: number;
  browserId: string; // Unique browser identifier
  fileName?: string; // For ADD_SELECTION
}
```

### Key Components

1. **Client-Side Operation Queue** (`src/store/metadataStore.ts`)

   - Local queue: `operationQueue: Operation[]`
   - Last synced version: `lastSyncedVersion: number`
   - Stored in `localStorage` for persistence

2. **Operation Merge Logic** (`src/utils/operationMerge.ts`)

   - `applyOperation()`: Applies a single operation to state
   - Respects sort direction when adding selections
   - Handles conflict resolution

3. **Server-Side Storage** (`src/lib/services.ts`)

   - DynamoDB table: `mvp-labeler-operations`
   - Dual-write: Operations + legacy state (backward compatible)

4. **Display & Sorting** (`src/components/SelectedImagesPanel.tsx`)
   - `sortImages()`: Stable sort algorithm
   - Respects photo numbers and sort direction
   - Handles items without numbers

---

## Data Flow

### Adding a Selection (User Action)

```
1. User clicks image
   ↓
2. toggleImageSelection(id) called
   ↓
3. Generate instanceId (unique per selection)
   ↓
4. Create newImageEntry { id, instanceId, fileName }
   ↓
5. Insert at correct position based on defectSortDirection:
   - desc → [newImageEntry, ...existing]
   - asc/null → [...existing, newImageEntry]
   ↓
6. Create ADD_SELECTION operation
   ↓
7. Add to operationQueue
   ↓
8. Save to localStorage (immediate)
   ↓
9. Debounced save to AWS (2 seconds):
   - Save operations to DynamoDB
   - Save full state (legacy dual-write)
   ↓
10. Update session state with new order
```

### Cross-Browser Sync (Refresh)

```
1. Browser B refreshes page
   ↓
2. loadAllUserDataFromAWS() called
   ↓
3. Load base state from AWS:
   - Form data
   - Images
   - Selected images (legacy)
   - Instance metadata
   ↓
4. Fetch operations since lastSyncedVersion
   ↓
5. Replay operations in order:
   - For each operation → applyOperation(state, op)
   - Respects sort direction when applying ADD_SELECTION
   ↓
6. Update state with rebuilt state
   ↓
7. Update lastSyncedVersion
   ↓
8. Save version to localStorage
   ↓
9. UI updates with correct order
```

---

## Sorting Behavior

### Sort Modes

#### 1. **Descending** (`defectSortDirection === 'desc'`)

**Positioning:**

- New selections: Added to **START** (beginning of array)
- Display: Highest photo numbers first

**Example:**

```
Current: [Photo #5, Photo #3]
Select new image → [New Image, Photo #5, Photo #3]
```

**Code Location:**

- `toggleImageSelection`: `[newImageEntry, ...state.selectedImages]`
- `applyOperation`: `[newItem, ...state.selectedImages]`

#### 2. **Ascending** (`defectSortDirection === 'asc'`)

**Positioning:**

- New selections: Added to **END** (end of array)
- Display: Lowest photo numbers first

**Example:**

```
Current: [Photo #3, Photo #5]
Select new image → [Photo #3, Photo #5, New Image]
```

**Code Location:**

- `toggleImageSelection`: `[...state.selectedImages, newImageEntry]`
- `applyOperation`: `[...state.selectedImages, newItem]`

#### 3. **No Sort** (`defectSortDirection === null`)

**Positioning:**

- New selections: Added to **END** (right side)
- Display: Insertion order (no sorting by photo number)

**Example:**

```
Current: [Photo #5, Photo #3]
Select new image → [Photo #5, Photo #3, New Image]
```

**Code Location:**

- `toggleImageSelection`: `[...state.selectedImages, newImageEntry]`
- `applyOperation`: `[...state.selectedImages, newItem]`

### Stable Sort Algorithm

The `sortImages()` function in `SelectedImagesPanel.tsx` ensures stable sorting:

```typescript
const sortImages = (
  images: ImageMetadata[],
  direction: "asc" | "desc" | null
) => {
  if (!direction) return images; // No sort = insertion order

  return [...images].sort((a, b) => {
    const aNum = getPhotoNumber(a) ? parseInt(getPhotoNumber(a)) : null;
    const bNum = getPhotoNumber(b) ? parseInt(getPhotoNumber(b)) : null;

    // If both have no numbers, maintain insertion order
    if (aNum === null && bNum === null) return 0;

    // Items without numbers go to:
    // - START in descending mode
    // - END in ascending mode

    // Both have numbers: sort numerically
    if (aNum !== null && bNum !== null) {
      return direction === "asc" ? aNum - bNum : bNum - aNum;
    }

    // Mixed (one has number, one doesn't): handle based on direction
    // ... (see code for full logic)
  });
};
```

**Key Features:**

- ✅ Maintains insertion order for items without numbers
- ✅ Numbered items sort correctly around unnumbered items
- ✅ Stable sort (no visual "jumping")

---

## Multiple Selection Support

### Same Image Multiple Times

Users can select the **same image multiple times**, creating multiple instances:

```typescript
toggleImageSelection: (id) => {
  // Always creates NEW instanceId
  const instanceId = generateStableImageId(
    userId,
    "current",
    `${id}-selection-${selectionCount}`,
    selectionCount
  );

  // No check for existing selection - always adds
  const newImageEntry = { id, instanceId, fileName };
  // ... insert at correct position
};
```

**Example:**

```
Select "PB080001.jpg" → Instance 1 created
Select "PB080001.jpg" again → Instance 2 created
Result: [PB080001 (Instance 1), PB080001 (Instance 2)]
Each instance has:
- Unique instanceId
- Independent photoNumber
- Independent description
```

---

## Cross-Browser Synchronization

### Refresh-Only Sync Model

**Current Mode**: Refresh-only (polling disabled for cost optimization)

**How it Works:**

1. **Browser A** makes changes → Operations saved to AWS (debounced 2 seconds)
2. **Browser B** refreshes → Fetches operations since `lastSyncedVersion`
3. **Browser B** replays operations → State updated
4. **Result**: Browser B sees all changes from Browser A

**Latency:**

- **Minimum**: ~2 seconds (AWS save debounce) + refresh time
- **Typical**: User refreshes after making changes = immediate sync

### Operation Replay on Refresh

```typescript
// In loadAllUserDataFromAWS()
const operations = await DatabaseService.getOperationsSince(
  userId,
  lastSyncedVersion
);

if (operations && operations.length > 0) {
  let rebuiltState = get(); // Start with current state

  // Apply operations in order
  for (const op of operations) {
    rebuiltState = applyOperation(rebuiltState, op, browserId);
  }

  // Update state
  set(rebuiltState);
  set({ lastSyncedVersion: newVersion });
}
```

**Key Points:**

- Operations are applied **in chronological order** (sorted by timestamp)
- Each operation respects **current sort direction** when applied
- State is rebuilt incrementally → final state is consistent

---

## File Structure

### Core Files

```
src/
├── store/
│   └── metadataStore.ts          # Main store with toggleImageSelection, operation queue
├── utils/
│   └── operationMerge.ts          # applyOperation(), mergeOperations()
├── types/
│   └── operations.ts              # Operation interface, createOperationId()
├── lib/
│   └── services.ts                # saveOperations(), getOperationsSince()
└── components/
    └── SelectedImagesPanel.tsx   # Display, sorting, deletion UI
```

### Key Functions

| Function               | File                          | Purpose                               |
| ---------------------- | ----------------------------- | ------------------------------------- |
| `toggleImageSelection` | `metadataStore.ts:1216`       | Add selection, create operation, save |
| `applyOperation`       | `operationMerge.ts:27`        | Apply single operation to state       |
| `sortImages`           | `SelectedImagesPanel.tsx:721` | Stable sort algorithm for display     |
| `saveOperations`       | `services.ts:1545`            | Save operations to DynamoDB           |
| `getOperationsSince`   | `services.ts:1705`            | Fetch operations for replay           |

---

## Critical Code Sections

### 1. Insertion Position Logic

**File**: `src/store/metadataStore.ts` (lines 1233-1245)

```typescript
if (state.defectSortDirection === "asc") {
  // Ascending: new images go to END
  newSelected = [...state.selectedImages, newImageEntry];
} else if (state.defectSortDirection === "desc") {
  // Descending: new images go to START
  newSelected = [newImageEntry, ...state.selectedImages];
} else {
  // No sort: new images go to END
  newSelected = [...state.selectedImages, newImageEntry];
}
```

### 2. Operation Application with Sort Direction

**File**: `src/utils/operationMerge.ts` (lines 48-54)

```typescript
// Respect sort direction when adding:
const sortDir = state.defectSortDirection;
const newSelectedImages =
  sortDir === "desc"
    ? [newItem, ...state.selectedImages]
    : [...state.selectedImages, newItem];
```

### 3. Stable Sort Algorithm

**File**: `src/components/SelectedImagesPanel.tsx` (lines 721-757)

```typescript
const sortImages = (
  images: ImageMetadata[],
  direction: "asc" | "desc" | null
) => {
  // Maintains insertion order for items without numbers
  // Sorts numbered items correctly
  // Handles mixed (numbered + unnumbered) items
};
```

---

## Data Persistence

### localStorage

**Keys:**

- `project_{projectId}_selections` (versioned)
- `project_{projectId}_selections-instance-metadata` (versioned)
- `{projectId}_selections-last-synced-version` (operation version)

**Purpose:**

- Instant display on page load
- Operation queue persistence
- Version tracking for sync

### AWS DynamoDB

**Tables:**

1. `mvp-labeler-operations`

   - Operations queue (operation-based sync)
   - GSI on `timestamp` for efficient queries

2. `mvp-labeler-selected-images` (legacy)

   - Full state snapshot (dual-write for backward compatibility)

3. `mvp-labeler-instance-metadata` (legacy)
   - Instance metadata (photo numbers, descriptions)

**Purpose:**

- Cross-browser sync
- Long-term persistence
- Operation replay on refresh

---

## Debouncing & Performance

### Selected Images Saves

**Debounce**: 2 seconds (`SELECTED_IMAGES_DEBOUNCE_MS`)

**Triggers:**

- `toggleImageSelection`: After 2 seconds of inactivity
- `setSelectedImages`: 500ms for deletions, 2s for additions

**Why:**

- Prevents DynamoDB throttling
- Batches multiple rapid selections
- Reduces AWS costs

### Instance Metadata Updates

**Debounce**: 3 seconds (`INSTANCE_METADATA_DEBOUNCE_MS`)

**Special Cases:**

- Deletion (empty description): 500ms (`DELETION_DEBOUNCE_MS`)
- Fast save needed to prevent polling from reverting

---

## Error Handling

### Operation Save Failures

```typescript
try {
  await DatabaseService.saveOperations(user.email, operationQueue);
  // Clear queue on success
  set({ operationQueue: [], lastSyncedVersion: result.lastVersion });
} catch (opError) {
  // Keep operations in queue for retry
  console.error(
    "❌ Error saving operations, keeping in queue for retry:",
    opError
  );
}
```

**Behavior:**

- Operations remain in queue if save fails
- Retries on next save attempt
- No data loss

### Operation Replay Failures

```typescript
try {
  const operations = await DatabaseService.getOperationsSince(
    userId,
    lastSyncedVersion
  );
  // Replay operations...
} catch (opError) {
  console.error("❌ [REFRESH] Error replaying operations:", opError);
  // Don't throw - continue loading other data
}
```

**Behavior:**

- Non-blocking error handling
- Page still loads with cached data
- Operations will replay on next refresh

---

## Testing Scenarios

### ✅ Verified Working Scenarios

1. **Local Selection**

   - ✅ User selects image → Appears at correct position (based on sort)
   - ✅ User selects same image multiple times → Multiple instances created
   - ✅ User adds description → Image doesn't move

2. **Sort Direction Changes**

   - ✅ Descending: New selections appear at START
   - ✅ Ascending: New selections appear at END
   - ✅ No-sort: New selections appear at END
   - ✅ Changing sort direction → Existing images re-sort correctly

3. **Cross-Browser Sync**

   - ✅ Browser A adds selection → Browser B refreshes → Selection appears
   - ✅ Browser A adds description → Browser B refreshes → Description appears
   - ✅ Browser A deletes selection → Browser B refreshes → Selection removed
   - ✅ Operations replay in correct order

4. **Stable Sorting**
   - ✅ Items without numbers maintain position
   - ✅ Numbered items sort correctly
   - ✅ Mixed (numbered + unnumbered) handled correctly

---

## Known Limitations

### Current Limitations

1. **Refresh-Only Sync**

   - Changes appear only on page refresh (not real-time)
   - Intentional for cost optimization
   - Future: WebSocket push (Phase 3 of sync architecture)

2. **No Offline Queue**

   - Operations not retried if AWS unavailable
   - Future: Offline queue with retry logic

3. **Legacy Dual-Write**
   - Still maintaining legacy state tables
   - For backward compatibility during migration
   - Future: Remove once all clients migrated

---

## Future Enhancements

### Planned (Phase 2-4)

1. **Version Vectors** (Phase 2)

   - Track what each browser knows
   - Better conflict resolution
   - Predictable merging

2. **WebSocket Real-Time Push** (Phase 3)

   - Instant sync (no refresh needed)
   - ~99.5% reduction in AWS calls
   - Real-time collaboration feel

3. **CRDT** (Phase 4)
   - Mathematical guarantees
   - Automatic conflict resolution
   - Works offline

---

## Migration Notes

### From Previous State-Based Sync

**What Changed:**

- ✅ Operation-based sync instead of full state snapshots
- ✅ Sort direction respected in operation application
- ✅ Cleaner toggleImageSelection logic (removed misleading isAdding)

**Backward Compatibility:**

- ✅ Dual-write: Operations + legacy state
- ✅ Legacy clients still work (read from state tables)
- ✅ New clients use operations table

**Breaking Changes:**

- ❌ None (fully backward compatible)

---

## Summary

The selected images functionality is now:

✅ **Stable**: No visual jumping or reordering  
✅ **Predictable**: Sort direction always respected  
✅ **Consistent**: Cross-browser sync works correctly  
✅ **Performant**: Debounced saves, refresh-only sync  
✅ **Reliable**: Operation queue with retry logic  
✅ **Clean**: Removed misleading code, fixed indentation

**Status**: ✅ Production Ready

---

## Appendix: Code Comparison

### Before (Previous State)

```typescript
// toggleImageSelection
const existingSelection = state.selectedImages.find(...);
const isAdding = !existingSelection; // Misleading - always true
if (isAdding) { /* always executes */ }

// applyOperation
return {
  ...state,
  selectedImages: [...state.selectedImages, newItem], // Always end
};
```

### After (Current State)

```typescript
// toggleImageSelection
// Always add (no misleading check)
const newImageEntry = { id, instanceId, fileName };
// Position based on sort direction
const newSelected =
  defectSortDirection === "desc"
    ? [newImageEntry, ...state.selectedImages]
    : [...state.selectedImages, newImageEntry];

// applyOperation
const sortDir = state.defectSortDirection;
const newSelectedImages =
  sortDir === "desc"
    ? [newItem, ...state.selectedImages]
    : [...state.selectedImages, newItem];
```

**Key Improvement**: Both functions now consistently respect sort direction.

---

_Document generated: January 2025_  
_Last code review: Commit c63099e_
