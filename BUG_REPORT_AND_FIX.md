# Critical Bug Report & Fix - Selected Images Persistence

**Date**: October 26, 2025  
**Issue**: Selected images disappearing after refresh  
**Status**: ✅ **FIXED** (Commit `c44fcc0`)

---

## User Reports

> "selected images flickered and after the three refreshes it disappeared including a second selection"

> "when i refresh the selected images are not persistently displayed"

> "cross browser also does not persist"

---

## Root Cause

**Inconsistent data storage format** between saving and loading:

### What Was Happening:

1. **`toggleImageSelection`** (lines 1071, 1107) - ✅ Correctly used `saveVersionedData()`
   ```typescript
   saveVersionedData(keys.selections, projectId, userId, selectedWithFilenames);
   ```

2. **`saveUserData`** (line 1706) - ❌ Used raw `localStorage.setItem()`
   ```typescript
   localStorage.setItem(keys.selections, JSON.stringify(selectedImages)); // WRONG!
   ```

3. **Polling sync** (line 2621) - ❌ Used raw `localStorage.setItem()`
   ```typescript
   localStorage.setItem(keys.selections, JSON.stringify(selectedImages)); // WRONG!
   ```

4. **`loadUserData`** (line 1577) - Expected versioned format
   ```typescript
   const savedSelections = loadVersionedData(projectKeys.selections);
   ```

### The Problem:

When polling synced data from AWS, it overwrote the correctly formatted versioned data with raw JSON. Then on the next refresh, `loadVersionedData()` tried to parse the raw JSON as if it were versioned, causing it to fail to read the `fileName` property and return `[]`.

---

## The Fix (Commit `c44fcc0`)

### Changed `saveUserData` (line 1706):
```typescript
// FROM:
localStorage.setItem(keys.selections, JSON.stringify(selectedImages));

// TO:
const projectId = generateStableProjectId(userId, 'current');
saveVersionedData(keys.selections, projectId, userId, selectedImages);
```

### Changed Polling Sync (line 2621):
```typescript
// FROM:
localStorage.setItem(keys.selections, JSON.stringify(selectedImages));

// TO:
const projectId = generateStableProjectId(userId, 'current');
saveVersionedData(keys.selections, projectId, userId, selectedImages);
```

---

## Why This Fixes It

✅ **Consistency**: All save paths now use `saveVersionedData()`  
✅ **Format**: All localStorage writes are in versioned format  
✅ **Loading**: `loadVersionedData()` can correctly parse the data  
✅ **fileName**: Migration can access `fileName` property  
✅ **Cross-browser**: Polling sync writes in correct format  

---

## Test Plan

After deployment:
1. Select an image
2. Enter photo number and description
3. Refresh page 3 times
4. Change tabs and come back
5. Verify: Selection persists ✅

Cross-browser:
1. Browser A: Select image, add data
2. Browser B: Wait for polling (5 seconds)
3. Browser B: Refresh
4. Verify: Selection appears with data ✅

---

## Deployment

- Commit: `c44fcc0`
- Time: ~3 minutes for Amplify deployment
- Status: Deployed

