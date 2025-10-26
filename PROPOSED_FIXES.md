# Proposed Fixes for Selected Images Persistence

## Analysis of All Commits and Code

### Commits Made for Selected Images
1. `db6aadd` - Use loadVersionedData for selections loading
2. `5b6828f` - Use saveVersionedData in AWS sync
3. `083ee67` - Fixed userId in saveUserData
4. `5d2db2f` - Fixed projectId in loadAllUserDataFromAWS
5. `fafda01` - Use saveVersionedData in toggleImageSelection
6. `cf4f0df` - Use saveVersionedData in setSelectedImages

### Issues Identified

#### **CRITICAL ISSUE #1: Inconsistent Loading Approach**
**Location**: Lines 1534-1547 in `loadUserData`

**Problem**:
- Images grid loads using: `localStorage.getItem(userSpecificKeys.images)` then `JSON.parse()`
- Selected images loads using: `loadVersionedData(projectKeys.selections)`
- **But `userSpecificKeys` is UNDEFINED** - causing ReferenceError
- This breaks images loading too (they just happen to work because of S3 fallback)

**Root Cause**: Line 1406 defines `projectKeys` but code at 1534 references `userSpecificKeys` which doesn't exist

**Proposed Fix**:
```typescript
// Line 1534: Change from userSpecificKeys to projectKeys
const savedImages = localStorage.getItem(projectKeys.images);

// Line 1543: Same fix
const savedImages = localStorage.getItem(projectKeys.images);
```

#### **CRITICAL ISSUE #2: Data Format Mismatch**
**Location**: Line 1555 in `loadUserData`

**Problem**:
- We're saving with `saveVersionedData()` which creates: `{version, timestamp, projectId, userId, data}`
- We're loading with `loadVersionedData()` which extracts `.data`
- BUT images use raw JSON parsing, not versioned format
- This mismatch causes data not to load

**Proposed Fix - Option A (Make images use versioned too)**:
```typescript
// Line 1534: Change to use loadVersionedData like selections
const savedImages = loadVersionedData(projectKeys.images);
```

**Proposed Fix - Option B (Make selections use raw JSON like images)**:
```typescript
// Line 1555: Change to use raw JSON parsing
const savedSelections = localStorage.getItem(projectKeys.selections);
if (savedSelections) {
  const parsed = JSON.parse(savedSelections);
  return Array.isArray(parsed) ? parsed : (parsed.data || []);
}
```

**Recommendation**: Option A - Make EVERYTHING use versioned format consistently

#### **CRITICAL ISSUE #3: Migration Happens on Empty Data**
**Location**: Line 1628 in `loadUserData`

**Problem**:
- `selectionsResult.value` might be `[]` (empty array)
- `migrateSelectedImageIds([], images)` returns `[]`
- We set `updates.selectedImages = []` which clears selections

**Console shows**: `Loaded selectedImages from storage: []`

**Proposed Fix**:
```typescript
// Line 1624-1632: Add check for empty array
if (selectionsResult.status === 'fulfilled' && selectionsResult.value && selectionsResult.value.length > 0) {
  console.log('📥 Loaded selectedImages from storage:', selectionsResult.value);
  
  const migratedSelections = migrateSelectedImageIds(selectionsResult.value, imagesResult.value || []);
  
  updates.selectedImages = migratedSelections;
} else {
  console.log('⚠️ No selectedImages found or empty array');
  // Don't set updates.selectedImages - keep existing state
}
```

## Summary of Proposed Changes

### Change 1: Fix userSpecificKeys Reference
**File**: `src/store/metadataStore.ts`  
**Lines**: 1534, 1543  
**Change**: Replace `userSpecificKeys.images` with `projectKeys.images`

### Change 2: Use Versioned Format Consistently
**File**: `src/store/metadataStore.ts`  
**Lines**: 1534, 1543  
**Change**: Use `loadVersionedData(projectKeys.images)` instead of raw JSON parsing

### Change 3: Fix Empty Array Handling
**File**: `src/store/metadataStore.ts`  
**Lines**: 1624-1632  
**Change**: Only update `selectedImages` if we have actual data, otherwise preserve existing state

## Why This Will Work

1. **Consistent Format**: Images and selections both use versioned format
2. **Correct Keys**: Using `projectKeys` which is defined (not undefined `userSpecificKeys`)
3. **Proper Empty Handling**: Won't clear selections when loaded array is empty
4. **Matches Working Pattern**: FormData and bulkData already use versioned format successfully

## Testing Plan

After fixes:
1. Select image → verify it appears in selected images tile
2. Add description/photo number → verify saves
3. Refresh page → verify selections persist
4. Cross-browser test → verify selections sync to other browser

