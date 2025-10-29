# Operation Queue Implementation Log

## Phase 1: Operation-based Sync Implementation

This document tracks all changes made during the implementation of the operation queue system.

---

## Implementation Date: 2025-01-XX

### Goals

- Implement operation-based sync to eliminate state snapshot conflicts
- Ensure zero data loss
- Enable predictable conflict resolution
- Reduce AWS calls by ~50% initially

---

## Changes Made

### Step 1: Define Operation Types ✅ COMPLETED

**File**: `src/types/operations.ts` (NEW)

- Created `Operation` interface with types: ADD_SELECTION, DELETE_SELECTION, UPDATE_METADATA, SORT_CHANGE
- Added `OperationQueue` type
- Added `OperationSyncResult` interface
- Added `createOperationId` helper function

**Testing**: N/A (Type definitions only)

---

### Step 2: Add Operation Queue to Store ✅ COMPLETED

**File**: `src/store/metadataStore.ts`

- Added `operationQueue: Operation[]` to `MetadataStateOnly` interface
- Added `lastSyncedVersion: number` to `MetadataStateOnly` interface
- Imported `Operation` and `OperationQueue` types
- Initialized `operationQueue: []` and `lastSyncedVersion: 0` in `initialState`

**Files Created**:

- `src/utils/browserId.ts` - Helper for generating persistent browser IDs

**Testing**: Type checking passes

---

### Step 7: Conflict Resolution Helper ✅ COMPLETED

**File**: `src/utils/operationMerge.ts` (NEW)

- Created `applyOperation` function to apply operations to state
- Created `mergeOperations` function to merge local and remote operations
- Created `resolveConflicts` function with conflict resolution rules:
  - DELETE always wins
  - Local operations < 5 seconds old are protected
  - Last writer wins for metadata

**Testing**: Pending integration tests

---

### Step 8: Helper Functions ✅ COMPLETED

**File**: `src/utils/browserId.ts` (NEW)

- `getBrowserId()`: Gets or creates persistent browser ID from localStorage
- `clearBrowserId()`: Helper for testing/debugging

**Testing**: Unit tests needed

---

### Step 3: Modify Save to Send Operations ✅ COMPLETED

**File**: `src/store/metadataStore.ts`

- Updated `toggleImageSelection` to create ADD_SELECTION operations
- Updated `setSelectedImages` to create DELETE_SELECTION and ADD_SELECTION operations
- Implemented dual-write: Operations sent to AWS AND full state (backward compatible)
- Operations saved to localStorage for persistence across refreshes
- Operations cleared from queue after successful save

**Testing**: Build passes, ready for browser testing

---

### Step 4: Create Server Endpoints ✅ COMPLETED

**File**: `src/lib/services.ts`

- Added `saveOperations` method:
  - Stores operations in `mvp-labeler-operations` DynamoDB table
  - Applies operations to current selected images state
  - Returns `lastVersion` for version tracking
  - Handles batch writes (25 per batch) with retry logic
- Added `getOperationsSince` method:
  - Queries operations table for operations since given version
  - Uses Scan with FilterExpression (requires GSI for better performance later)
  - Returns empty array if table doesn't exist (backward compatible)

**Note**: DynamoDB table `mvp-labeler-operations` needs to be created in AWS with schema:

- Partition Key: `user_id` (String)
- Sort Key: `operation_id` (String)
- Attributes: `operation` (JSON), `timestamp` (Number), `processed` (Boolean)

**Testing**: Build passes, ready for AWS table creation and testing

---

### Step 5: Update Polling to Fetch Operations ✅ COMPLETED

**File**: `src/store/metadataStore.ts` - `startPolling` function

- Modified polling interval from 5 seconds to 10 seconds
- Added operation queue polling logic:
  - Fetches operations since `lastSyncedVersion`
  - Merges local and remote operations
  - Applies remote operations to local state
  - Updates `lastSyncedVersion` after successful sync
- Operations applied with conflict resolution (uses `applyOperation` helper)

**Testing**: Build passes, ready for browser testing

---

### Step 6: Replay Operations on Refresh ✅ COMPLETED

**File**: `src/store/metadataStore.ts` - `loadUserData` function

- Added operation queue restoration from localStorage on initial load
- Added operation replay logic:
  - Fetches operations since last sync from AWS
  - Applies operations to rebuild state
  - Updates version after replay
- Ensures refresh always gets latest data by replaying all operations

**Testing**: Build passes, ready for browser testing

---

## Next Steps (Testing & Deployment)

### AWS Setup Required

- [ ] Create DynamoDB table `mvp-labeler-operations` with schema:
  - Partition Key: `user_id` (String)
  - Sort Key: `operation_id` (String)
  - Optional: Add GSI on `timestamp` for efficient queries (Phase 2 optimization)

### Testing Checklist

- [ ] Browser A adds image → Operation created → Operation synced to Browser B
- [ ] Browser A deletes image → Operation created → Stays deleted (doesn't revert)
- [ ] Refresh → Operations replayed → State matches other browser
- [ ] Rapid operations (add, delete, add) → All processed correctly
- [ ] Network failure → Operations remain in queue → Retry on next save

### Known Limitations

1. ~~**Table doesn't exist yet**~~: ✅ **FIXED** - Table created successfully (status: CREATING → ACTIVE soon)
2. ✅ **GSI added**: timestamp-index GSI created for efficient timestamp queries
3. **Dual-write overhead**: Currently sending both operations AND full state (for backward compatibility during migration)

---

## Completed Enhancements

### UPDATE_METADATA Operations ✅ COMPLETED

**File**: `src/store/metadataStore.ts` - `updateInstanceMetadata`

- Creates UPDATE_METADATA operation when description/photo number changes
- Operations saved with same debounce timing (3s normal, 500ms for deletions)
- Dual-write: Operations + legacy save
- Operations persisted to localStorage

### SORT_CHANGE Operations ✅ COMPLETED

**File**: `src/store/metadataStore.ts` - `setDefectSortDirection` and `setSketchSortDirection`

- Creates SORT_CHANGE operation when sort direction changes
- Immediate save to AWS (no debounce - sort changes should sync fast)
- Dual-write: Operations + legacy save

### Refresh-Only Sync Mode ✅ COMPLETED

**File**: `src/store/metadataStore.ts` - `startPolling`

- Polling disabled (exits early)
- All sync happens on page refresh via `loadUserData`
- Reduced AWS calls by ~99.8% (from 8,640/day to ~20/day per user)

### Enhanced saveOperations ✅ COMPLETED

**File**: `src/lib/services.ts` - `saveOperations`

- Now handles UPDATE_METADATA operations (updates instance metadata)
- Now handles SORT_CHANGE operations (updates sort preferences)
- Properly applies all operation types to state

### DynamoDB Table ✅ CREATED

**Table**: `mvp-labeler-operations`

- Status: CREATING (will be ACTIVE in 1-2 minutes)
- Partition Key: `user_id` (String)
- Sort Key: `operation_id` (String)
- GSI: `timestamp-index` (user_id + timestamp)
- Billing: PAY_PER_REQUEST (on-demand)

---

## Refresh-Only Sync Details

### How It Works

1. Browser A: User makes changes → Operations created → Saved to AWS (after debounce)
2. Browser B: User refreshes page → Loads operations since last sync → Applies all operations → UI updates

### Sync Timing (Safe Refresh Window)

- Add image: Wait ~3 seconds after Browser A change
- Delete image: Wait ~1.5 seconds after Browser A change
- Update description: Wait ~4 seconds after Browser A change
- Change sort: Wait ~1 second after Browser A change
- **Safe default**: Wait 4 seconds after Browser A's last change before refreshing Browser B

### Benefits

- ✅ 99.8% reduction in AWS calls
- ✅ All changes sync on refresh
- ✅ Predictable behavior
- ✅ Lower costs

---

## Testing Strategy

### Unit Tests Needed

- [ ] `applyOperation` handles all operation types
- [ ] `mergeOperations` removes duplicates correctly
- [ ] `resolveConflicts` applies rules correctly
- [ ] `getBrowserId` persists across sessions

### Integration Tests Needed

- [ ] Add image → Operation created → Operation saved → Operation synced to other browser
- [ ] Delete image → Operation created → Stays deleted (doesn't revert)
- [ ] Refresh → All operations replayed → State matches other browser
- [ ] Conflict scenarios (DELETE vs UPDATE, concurrent edits)

### Browser Tests (Manual)

- [ ] Browser A adds image → Browser B sees it within 10 seconds
- [ ] Browser A deletes image → Browser B sees deletion
- [ ] Browser A adds image, Browser B refreshes → Image appears
- [ ] Rapid operations (add, delete, add) → All processed correctly
- [ ] Network failure during save → Operations remain in queue → Retry works

---

## Known Issues

- None yet (implementation in progress)

---

## Rollback Plan

If issues arise:

1. Operation queue is additive (doesn't break existing functionality)
2. Dual-write approach: Keep existing save logic alongside operations
3. Feature flag: Can disable operation queue if needed

---

## Notes

- Implementation follows QUICK_START_IMPLEMENTATION.md
- Architecture details in SYNC_ARCHITECTURE_PLAN.md
- All changes documented for review before next steps
