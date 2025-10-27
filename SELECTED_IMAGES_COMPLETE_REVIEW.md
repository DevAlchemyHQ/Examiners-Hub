# Selected Images Complete Review - All Issues Since Commit 956c40

## Current Issues (October 27, 2025)

### Issue 1: Deletion Makes Image Move to First Position
**Symptoms:**
- User deletes a selected image
- Instead of being removed, it moves to first position

**Root Cause Analysis Needed:**
- Check `handleInstanceDeletion` logic
- Check if `setSelectedImages` is causing re-sort
- Check if polling is interfering

### Issue 2: Clicking Sorter Erases Description
**Symptoms:**
- User clicks sorter toggle
- Description field gets cleared

**Root Cause Analysis Needed:**
- Check `setDefectSortDirection` logic
- Check if sort is resetting metadata
- Check if sorting is overwriting instanceMetadata

## Documentation Since Commit 956c40

### 1. Selected Images Persistence Fixes
- **Commit db6aadd**: Use loadVersionedData for selections
- **Commit 5b6828f**: Use saveVersionedData in AWS sync  
- **Commit 083ee67**: Fixed userId in saveUserData
- **Commit 827b06f**: Added smartAutoSave to updateInstanceMetadata
- **Commit 217f38d**: Added selected images to polling

### 2. Stable Sort Fix
- **Commit f448d0f**: Stable sort to prevent bobbing
- **Commit f04793f**: New image positioning based on sort mode
- **Commit 5c8baed**: Don't reorder items without photo numbers

### 3. Deletion Fix
- **Commit c56d66e**: Prevent AWS from restoring deleted images

## Key Files to Review

### 1. `src/store/metadataStore.ts`
- **Line 1055**: `toggleImageSelection` - insertion logic
- **Line 1247**: `clearSelectedImages` - deletion logic
- **Line 269**: `setSelectedImages` - setting logic
- **Line 984**: `updateInstanceMetadata` - metadata updates

### 2. `src/components/SelectedImagesPanel.tsx`
- **Line 260**: `handleInstanceDeletion` - deletion handler
- **Line 717**: `sortImages` - sort algorithm
- **Line 285**: `setDefectSortDirection` - sort toggle

## Commits to Review
- 956c401: Revert to working state
- 827b06f: Smart auto-save for selections
- 217f38d: Add to polling
- f448d0f: Stable sort
- f04793f: New image positioning
- 5c8baed: Don't reorder items without numbers
- c56d66e: Prevent AWS restore

