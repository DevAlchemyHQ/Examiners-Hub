# Brainstorm: Selected Images Ordering Behavior

## Current Issue

When a user selects a new image, it appears but then "jumps" to a different position when they're NOT in sort mode.

## User's Requirements

### Scenario 1: Ascending Order (Sort Enabled)

- User has images sorted ascending (1, 2, 3, 4...)
- User selects a new image
- **Expected**: New image appears at the END (bottom) of the list
- **Current**: Image jumps to incorrect position ❌

### Scenario 2: Descending Order (Sort Enabled)

- User has images sorted descending (10, 9, 8, 7...)
- User selects a new image
- **Expected**: New image appears at the START (top) of the list
- **Current**: Image jumps to incorrect position ❌

### Scenario 3: No Sort (Sort Disabled)

- User has unsorted images (manual order)
- User selects a new image
- **Expected**: New image stays at the END (where it was added)
- **Current**: Image "jumps/shifts" to different position ❌

## Current Flow Analysis

Looking at the code:

1. `toggleImageSelection()` adds image to END: `[...state.selectedImages, { id, instanceId, fileName }]`
2. `SelectedImagesPanel` applies sorting if enabled
3. Sorting is based on photo numbers

## The Problem

When sorting is **enabled**:

```typescript
const sortImages = (images, direction) => {
  return [...images].sort((a, b) => {
    // Sorts by photo number
    return direction === "asc" ? aNum - bNum : bNum - aNum;
  });
};
```

This re-sorts ALL images, including the newly added one, based on photo number - causing the "jump".

## Proposed Solution

### Option 1: Append to End (Simplest)

When sort is **disabled**: Just append to end (current behavior)
When sort is **enabled**: Append to end, but then sort the NEW position

```typescript
// When sort is enabled (ascending):
// Old: [1, 2, 3]
// User selects image 5
// Step 1: Append → [1, 2, 3, 5]
// Step 2: Sort → Image 5 should move to end because it's highest
// Result: [1, 2, 3, 5] ✓

// When sort is enabled (descending):
// Old: [10, 9, 8]
// User selects image 11
// Step 1: Append → [10, 9, 8, 11]
// Step 2: Sort → Image 11 should move to START because descending
// Result: [11, 10, 9, 8] ✓

// When sort is disabled:
// Old: [A, B, C]
// User selects image D
// Result: [A, B, C, D] (stay at end)
```

### Option 2: Maintain Selection Order

Don't sort newly added images - maintain insertion order

- New images always appear at end
- Sort only affects existing images

## Questions for User

1. When sort is **ascending**, should the new image:

   - A) Appear at end and STAY there (even if photo number is 5 in list of 1,2,3,4)?
   - B) Automatically move to its correct sorted position based on photo number?

2. When sort is **disabled**, should new images:

   - A) Always go to end (current behavior - seems right?)
   - B) Respect the "jump" issue you're seeing?

3. What causes the "jump" when sort is disabled?
   - Is it happening on re-render?
   - Is the sorting accidentally triggering when it shouldn't?

## My Understanding

Based on your request:

- Ascending: New image → appear at END → stay at end (highest number goes to end naturally)
- Descending: New image → appear at START → stay at start (highest number goes to start naturally)
- No sort: New image → appear at END → STAY at end (don't shift)

Is this correct?
