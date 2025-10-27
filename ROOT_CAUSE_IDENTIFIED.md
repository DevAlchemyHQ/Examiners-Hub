# Root Cause Identified

## Issue 1: Deletion Reappears (Same Image)
**Root Cause:** Polling is restoring from AWS after `setSelectedImages` saves empty array

**Flow:**
1. User deletes image → `handleInstanceDeletion` filters it out
2. Calls `setSelectedImages(newSelected)` with filtered array
3. `setSelectedImages` saves to AWS (line 1222-1245) with filtered array
4. BUT: Polling (line 2661-2674) checks if `selectedImages.length === 0`
5. If local is 0, it skips sync
6. BUT AWS still has old data
7. Next polling cycle (5 seconds later) syncs from AWS
8. Image reappears!

**Why it reappears at FIRST position:**
- When polling syncs from AWS, it uses `migrateSelectedImageIds`
- Migration adds to array in original AWS order
- Original AWS had deleted image
- So it adds back to first position

## Issue 2: Sorter Clears Description
**Root Cause:** Not yet identified, but likely:
1. Sort algorithm is reordering array
2. Something is clearing instanceMetadata when sort direction changes

## Fix Needed

### Fix 1: Prevent Polling from Overriding Deletion
**Location:** `src/store/metadataStore.ts` line 2661-2674

**Current Code:**
```typescript
if (currentState.selectedImages.length === 0) {
  console.log('⏸️ [POLLING] Skipping AWS sync - local state is empty (user deleted all)');
} else {
  const migratedSelections = migrateSelectedImageIds(selectedImages, currentState.images);
  if (migratedSelections.length > 0) {
    updates.selectedImages = migratedSelections;
    console.log('✅ [POLLING] Migrated selected images:', migratedSelections.length);
  }
}
```

**Problem:** This only prevents sync if local is EMPTY (length === 0). But if local has some images (e.g., user deleted one), it will sync from AWS and restore the deleted one!

**Fix:** Need to compare local vs AWS arrays to see if any items were deleted locally

### Fix 2: Sorter Issue
**Need to investigate:**
- Look at what happens when `setDefectSortDirection` is called
- Check if sort algorithm is somehow clearing instanceMetadata
- Check if session state is being reset

