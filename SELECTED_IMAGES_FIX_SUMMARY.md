# Selected Images Persistence - Final Fix

**Date**: October 26, 2025  
**Commit**: `55277f9`  
**Status**: Fix deployed

---

## Problem Summary

User reported:

1. Selected images flicker on first refresh
2. Disappear on third refresh
3. Second selection also disappears
4. Cross-browser sync not persisting properly

---

## Root Cause Identified

The issue was in `loadUserData` at line 1653 of `metadataStore.ts`:

**Problem 1**: The condition `selectionsResult.value.length > 0` was too strict

- If migration failed (returned empty array), the selections were never applied
- Even if data existed, it was discarded

**Problem 2**: Migration didn't preserve `fileName` in returned data

- Future migrations would fail because `fileName` was missing
- Only `id` and `instanceId` were preserved

**Problem 3**: No fallback when images not loaded yet

- Selections could be saved before images load
- Migration would fail immediately because no images to match against

---

## Fix Applied

### 1. Improved Loading Logic (Lines 1653-1684)

**Before**:

```typescript
if (
  selectionsResult.status === "fulfilled" &&
  selectionsResult.value &&
  selectionsResult.value.length > 0
) {
  // migrate and apply
} else {
  // nothing
}
```

**After**:

```typescript
if (selectionsResult.status === "fulfilled" && selectionsResult.value) {
  // Log detailed info
  // Try to migrate if images are loaded
  // If migration fails, preserve original selections temporarily
  // If images not loaded yet, preserve original selections
}
```

### 2. Added fileName to Migration (Lines 452-457, 473-477)

**Before**:

```typescript
migratedSelections.push({
  id: targetImage.id,
  instanceId: preservedInstanceId,
});
```

**After**:

```typescript
migratedSelections.push({
  id: targetImage.id,
  instanceId: preservedInstanceId,
  fileName: targetImage.fileName, // Preserve for future migrations
});
```

### 3. Updated Return Type (Line 368, 376)

**Before**:

```typescript
): Array<{ id: string; instanceId: string }>
```

**After**:

```typescript
): Array<{ id: string; instanceId: string; fileName?: string }>
```

---

## Expected Behavior After Fix

1. **Initial Selection**: Image selected, metadata entered, saved to localStorage and AWS
2. **First Refresh**: Selections load from localStorage, migration finds matches, selections persist ✅
3. **Second Refresh**: Same as first refresh, selections persist ✅
4. **Third Refresh**: Same as first and second, selections persist ✅
5. **Cross-Browser Sync**: Selections sync from AWS, appear on other browser, persist after refresh ✅

---

## Key Changes

1. Added fallback logic when migration returns empty array
2. Preserved original selections when images haven't loaded yet
3. Added `fileName` to migrated selections for future persistence
4. Added detailed logging to debug loading issues

---

## Testing Plan

After deployment (3 minutes):

1. Select an image
2. Enter photo number and description
3. Refresh page 3 times
4. Check if selections persist
5. Test cross-browser sync
6. Check console logs for any errors

---

## Status

✅ Fix applied and deployed  
⏳ Waiting for deployment to complete  
⏳ Ready for testing
