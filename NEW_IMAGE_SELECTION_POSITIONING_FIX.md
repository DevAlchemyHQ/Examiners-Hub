# New Image Selection Positioning Fix

## Issue Description

User reported that when selecting new images from the grid:
- **Descending order:** New image should appear at START (before photo #5)
- **Ascending order:** New image should appear at END (after photo #5)
- **No sort:** New image should appear at END (right side)
- **When adding description:** Image should NOT move from its position

## Root Cause

The `toggleImageSelection` function was always appending new images to the end of the `selectedImages` array:

```typescript
const newSelected = [...state.selectedImages, { id, instanceId, fileName }];
```

This ignored the sort mode, causing incorrect positioning.

## The Fix (Commit f04793f)

Modified `toggleImageSelection` in `src/store/metadataStore.ts` to insert new images based on sort mode:

```typescript
// NEW FIX: Insert new image at correct position based on sort mode
const newImageEntry = { id, instanceId, fileName };
let newSelected: Array<{ id: string; instanceId: string; fileName?: string }>;

if (state.defectSortDirection === 'asc') {
  // Ascending: new images go to END (after highest number)
  newSelected = [...state.selectedImages, newImageEntry];
  console.log('🔧 toggleImageSelection (ascending) - Added to end:', { id, instanceId, fileName });
} else if (state.defectSortDirection === 'desc') {
  // Descending: new images go to START (before highest number)
  newSelected = [newImageEntry, ...state.selectedImages];
  console.log('🔧 toggleImageSelection (descending) - Added to start:', { id, instanceId, fileName });
} else {
  // No sort: new images go to END (right side)
  newSelected = [...state.selectedImages, newImageEntry];
  console.log('🔧 toggleImageSelection (no sort) - Added to end:', { id, instanceId, fileName });
}
```

## Expected Behavior

### Descending Sort Mode
```
Existing: [Photo #5]
Select new image → Appears BEFORE #5
Result: [New Image, Photo #5]
```

### Ascending Sort Mode  
```
Existing: [Photo #5]
Select new image → Appears AFTER #5
Result: [Photo #5, New Image]
```

### No Sort Mode
```
Existing: [Photo #5]
Select new image → Appears AFTER #5
Result: [Photo #5, New Image]
```

### When Editing Metadata (Already Selected Images)
```
Existing order: [Photo #5, Photo #3, Photo #2]
User adds description to Photo #3 → Photo #3 stays in position
Result: [Photo #5, Photo #3 (with description), Photo #2]
```

**Key:** The stable sort algorithm in `SelectedImagesPanel.tsx` ensures that once an image is in position (based on sort mode), it doesn't jump around when you edit its metadata.

## How It Works Together

1. **New Selection (`toggleImageSelection`):**
   - Checks `state.defectSortDirection`
   - Inserts new image at START (desc) or END (asc/no sort)
   - Sets initial position in array

2. **Editing Metadata (`updateInstanceMetadata`):**
   - Updates `instanceMetadata` object only
   - Does NOT modify `selectedImages` array order
   - Position stays stable

3. **Display (`sortImages` in `SelectedImagesPanel.tsx`):**
   - Reads current sort mode from `defectSortDirection`
   - Applies stable sort algorithm
   - Preserves order for items without numbers
   - Sorts items with numbers

## Testing Checklist

- [ ] Test descending mode: new image appears at START
- [ ] Test ascending mode: new image appears at END  
- [ ] Test no sort mode: new image appears at END
- [ ] Test editing description: image doesn't move
- [ ] Test adding photo number: image moves to correct sorted position
- [ ] Test multiple selections: each appears at correct position

## Related Files

- `src/store/metadataStore.ts` (lines 1055-1084): New selection insertion logic
- `src/components/SelectedImagesPanel.tsx` (lines 717-748): Stable sort algorithm
- Previous fix: `STABLE_SORT_FIX_DOCUMENTATION.md`

## Notes

This fix builds on the previous stable sort fix. The two work together:
1. **This fix:** Ensures new images are inserted at the correct position
2. **Previous fix:** Ensures images don't jump around when metadata is edited

Together, they provide a smooth, predictable labeling experience.

