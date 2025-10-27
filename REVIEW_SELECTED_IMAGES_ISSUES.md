# Selected Images Issues Review

## Current Problems (User Report Oct 27, 2025)

### Problem 1: Deletion Makes Image Move to First Position
**User says:** "when i add a selected image and try to delete it it moves to the first rather than removing it"

**Possible Causes:**
1. `handleInstanceDeletion` is not working correctly
2. `setSelectedImages` is re-sorting the array
3. Polling is interfering with deletion

**Location:** `src/components/SelectedImagesPanel.tsx` line 260-275

**Current Code:**
```typescript
const handleInstanceDeletion = (instanceIdToDelete: string) => {
  console.log('🗑️ Deleting instance:', instanceIdToDelete);
  
  const newSelected = selectedImages.filter(item => item.instanceId !== instanceIdToDelete);
  
  console.log('🗑️ New selectedImages after deletion:', newSelected);
  
  setSelectedImages(newSelected);
  
  if (instanceIdToDelete) {
    updateInstanceMetadata(instanceIdToDelete, { photoNumber: '', description: '' });
  }
};
```

**Analysis:**
- Code looks correct - filters out deleted instance
- Issue might be that `setSelectedImages` is applying sort
- Or polling is syncing from AWS

### Problem 2: Clicking Sorter Erases Description
**User says:** "when i click the sorter it errases the decription"

**Possible Causes:**
1. `setDefectSortDirection` is resetting metadata
2. Sort algorithm is reordering and losing data
3. Something else is clearing instanceMetadata

**Location:** `src/store/metadataStore.ts` line 1255-1268

**Current Code:**
```typescript
setDefectSortDirection: (direction) => {
  set({ defectSortDirection: direction });
  
  setTimeout(() => {
    const state = get();
    get().updateSessionState({
      sortPreferences: {
        defectSortDirection: direction,
        sketchSortDirection: state.sketchSortDirection
      }
    });
  }, 100);
}
```

**Analysis:**
- Only sets sort direction, doesn't touch instanceMetadata
- Issue must be in `sortImages` function or somewhere else

## What's Been Fixed Previously

1. **Polling skip when empty** (c56d66e) - ✅ This works
2. **Stable sort** (5c8baed) - ✅ Should prevent jumping
3. **Insertion positioning** (f04793f) - ✅ Should insert at correct position

## What's NOT Fixed (New Issues)

1. **Individual deletion** - Moving to first instead of removing
2. **Sorter clearing descriptions** - Description gets erased

## Need to Investigate

1. Look at what happens when `setSelectedImages` is called
2. Look at what happens when sort direction changes
3. Check if polling is interfering
4. Check if sort algorithm is somehow clearing metadata

