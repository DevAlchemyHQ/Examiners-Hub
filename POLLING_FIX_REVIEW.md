# Polling Fix Review - Selected Images Sync Issue

## Current Status

**Date:** October 26, 2025  
**Commit:** 9362b0b  
**Issue:** Incognito browser not syncing new selections from other browsers

## What Was Fixed

### The Bug
The polling mechanism was trying to destructure `getSelectedImages()` result:
```typescript
// BEFORE (WRONG):
const { selectedImages } = await DatabaseService.getSelectedImages(userId);
```

But `getSelectedImages()` returns an array directly, not an object with a `selectedImages` property.

### The Fix (Commit 9362b0b)
Changed to use the array directly:
```typescript
// AFTER (CORRECT):
const selectedImages = await DatabaseService.getSelectedImages(userId);
```

Also fixed variable scoping for `mergedInstanceMetadata` and `hasNewerData` to be accessible in the update section.

## Testing Results

### What Works ✅
1. **Local selections persist on refresh** - Selections are loaded from localStorage and shown correctly
2. **Instance metadata syncs** - Descriptions and photo numbers are preserved
3. **Polling runs every 5 seconds** - The mechanism is active and checking AWS
4. **No errors in polling code** - The fix is syntactically correct

### What Doesn't Work ❌
1. **AWS returns 0 selections** - The key issue: `getSelectedImages()` returns an empty array
2. **Cross-browser sync fails** - Because AWS has no data, polling can't sync new selections
3. **Selected images not saving to AWS** - The root cause appears to be in `updateSelectedImages` or DynamoDB table

## Root Cause Analysis

Looking at the logs:
```
📸 Selected images loaded from AWS: 0
⚠️ AWS returned empty array - preserving existing localStorage selections
```

This means either:
1. **DynamoDB table has no selections** - Data was never saved successfully
2. **Query is failing silently** - `getSelectedImages()` returns empty array on error
3. **Data was cleared** - Previous operations cleared the selections in AWS

## Code Review - All Commits for Selected Images

### Commit 827b06f
- Added `smartAutoSave('selections')` to trigger sync
- ✅ Good - Triggers AWS save

### Commit 87319c1
- Fixed `userId` not defined error
- ✅ Good - Variable scoping fix

### Commit 217f38d  
- Extended polling to sync selected images and metadata
- ✅ Good - Polling now checks for selections

### Commits fafda01, cf4f0df
- Switched to versioned data format
- ✅ Good - Consistent data format

### Commit 48567da
- Fixed saving `selectedWithFilenames` instead of `newSelected`
- ✅ Good - Preserves fileName

### Commit 6008aac
- Fixed migration to use fileName from selected item
- ✅ Good - Better migration logic

### Commit 55277f9
- Handle empty selections more gracefully
- ✅ Good - Prevents data loss

### Commits c8462f6, a0afe1a
- Prevent saving empty arrays to AWS
- ✅ Good - Prevents clearing selections

### Commits 1cf5642, 06d79d8
- Debounced saves for instance metadata
- ✅ Good - Prevents excessive AWS calls

### Commit 9362b0b (Latest)
- Fixed polling to use array directly from getSelectedImages
- ✅ Good - Correct syntax
- ⚠️ BUT: Still returns 0 from AWS

## The Real Problem

The issue is NOT in the polling code anymore. The issue is that **AWS DynamoDB has no selected images data**.

This suggests:
1. **Selected images are being cleared from AWS** - Need to investigate `updateSelectedImages`
2. **Data is not being saved in the first place** - Need to check `toggleImageSelection` and `setSelectedImages`
3. **DynamoDB permissions issue** - Selected images table might have permission problems

## What Needs Investigation

1. Check DynamoDB table `mvp-labeler-selected-images` directly
2. Verify `updateSelectedImages` is actually writing data
3. Check if selections are being saved when user toggles images
4. Add more logging to `getSelectedImages` to see what's being queried

## Next Steps

1. Add comprehensive logging to `getSelectedImages` to see if DynamoDB returns any data
2. Test `updateSelectedImages` to confirm it's saving to DynamoDB
3. Check if `toggleImageSelection` is actually calling `updateSelectedImages`
4. Consider if there's a race condition clearing the data

## Current Assessment

The polling fix (commit 9362b0b) is **correct**, but it's treating the symptom, not the disease. The real issue is that **selected images are not being saved to AWS DynamoDB in the first place**.

Without data in DynamoDB, polling will always get 0 selections, and cross-browser sync will never work.

## Recommendation

Need to investigate why `updateSelectedImages` is not writing to DynamoDB or why the data is being cleared.
