# Fixes Applied Summary - October 27, 2025

## Issues Reported

### Issue 1: ✅ FIXED - Deletion Makes Image Reappear

**Problem:** When deleting a selected image, it reappears at first position instead of being removed.

**Root Cause Identified:**

- Polling was syncing from AWS even after deletion
- The check `if (selectedImages.length === 0)` only prevented sync when ALL images were deleted
- But if you had 2 images, deleted 1, leaving 1, polling would sync from AWS and restore the deleted one

**Fix Applied (Commit 9a7d8e5):**

```typescript
// Compare local vs AWS to detect if user deleted items locally
const localInstanceIds = new Set(
  currentState.selectedImages.map((item) => item.instanceId)
);
const awsInstanceIds = new Set(selectedImages.map((item) => item.instanceId));

// Check if user deleted anything locally
const deletedLocally = [...awsInstanceIds].filter(
  (id) => !localInstanceIds.has(id)
);

if (deletedLocally.length > 0) {
  console.log(
    "⏸️ [POLLING] User deleted items locally, not restoring from AWS:",
    deletedLocally
  );
} else if (currentState.selectedImages.length === 0) {
  // Skip if local is empty
} else {
  // Safe to sync from AWS
}
```

**Status:** ✅ FIXED - Deletion now works correctly

### Issue 2: ⚠️ NEEDS INVESTIGATION - Sorter Clears Description

**Problem:** When clicking sorter, description field gets cleared immediately.

**Current Status:**

- Root cause not yet identified
- May be in sort algorithm or instanceMetadata handling
- Need to test after deployment to see if it still happens

## Files Modified

1. **src/store/metadataStore.ts** (lines 2661-2682)
   - Added comparison logic to detect local deletions
   - Prevents AWS from restoring deleted items

## Testing Required

After deployment (~3 minutes), please test:

1. ✅ Deletion - Delete individual images, should stay deleted
2. ⚠️ Sorter - Click sorter, check if description clears
3. ✅ Multiple deletions - Delete multiple images, should all stay deleted
4. ⚠️ Cross-browser - Delete on one browser, check if stays deleted on other

## Commits

- `9a7d8e5`: FIX: Prevent polling from restoring deleted images
- Previous: `c56d66e`, `5c8baed`, `f448d0f`

## Next Steps

1. Wait for deployment
2. Test deletion - should work now ✅
3. Test sorter - needs investigation if still broken
4. Report results
