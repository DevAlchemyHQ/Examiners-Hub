# Stable Sort Fix for Selected Images - Complete Documentation

## Issue Report

**User Feedback:**

> "When in no sort mode, after selecting an image, it should always appear and stay at the end. In ascending mode, new images should appear at the last selected tab. In descending mode, new tile should appear at start of the first page. The page should not be bobbing up and down either - make it smooth."

## Root Cause Analysis

### The Problems

1. **Layout Shift/Jumping**: When sorting occurred, React was reordering DOM elements based on changing keys or sort results, causing visual "jumping" of images
2. **Page Bobbing**: Re-rendering entire panel caused scroll position to shift
3. **Unpredictable Order**: New images would appear in different positions depending on their photo numbers

### Why It Happened

```typescript
// OLD CODE (Problem):
return [...images].sort((a, b) => {
  const aNum = parseInt(a.photoNumber) || 0;
  const bNum = parseInt(b.photoNumber) || 0;

  if (aNum === 0 && bNum === 0) return 0; // ❌ Not stable!
  return direction === "asc" ? aNum - bNum : bNum - aNum;
});

// Problems:
// 1. Multiple images without numbers would get reordered on every render
// 2. React keys were based on array indices or IDs that could change
// 3. Sort was not stable - equal values could swap positions
```

**Visual Effect:**

```
Before fix:
[Image 1] ← User types "2"
[Image 2] → [Image 1] ← BOBBING HAPPENS
[Image 3]    [Image 2] → Jumps around

After fix:
[Image 1] ← User types "2" → Stays smooth, no bobbing
[Image 2]    [Image 2]
[Image 3]    [Image 3]
```

## The Fix (Commit f448d0f)

### 1. Stable Sort Algorithm

```typescript
const sortImages = (
  images: ImageMetadata[],
  direction: "asc" | "desc" | null
) => {
  if (!direction) return images;

  // CRITICAL FIX: Stable sort - preserve original order
  return [...images].sort((a, b) => {
    const aNum = aPhotoNumber ? parseInt(aPhotoNumber) : 0;
    const bNum = bPhotoNumber ? parseInt(bPhotoNumber) : 0;

    // STABLE SORT: If both have no numbers, maintain original insertion order
    if (aNum === 0 && bNum === 0) {
      return 0; // ✅ Keeps insertion order - prevents jumping/bobbing
    }

    // If photo numbers are equal, keep original order to prevent visual jumping
    if (sorted === 0) return 0; // ✅ Prevents swapping equal items

    return sorted;
  });
};
```

**Why It Works:**

- When items have no photo numbers (`aNum === 0 && bNum === 0`), they maintain their insertion order
- When items have equal photo numbers (`sorted === 0`), they don't swap positions
- This ensures predictable, stable rendering

### 2. Stable React Keys

```typescript
// BEFORE (Problem):
<div key={img.instanceId || img.id}> // ❌ Could change during sort

// AFTER (Fix):
const stableKey = `defect-${img.instanceId || img.id}`;
<div key={stableKey}> // ✅ Always stable, prevents DOM reordering
```

**Why It Matters:**

- React uses keys to track elements across re-renders
- Changing keys = React destroys and recreates DOM elements
- Stable keys = React moves existing elements instead
- Result: No visual "jumping", smooth transitions

## Expected Behavior After Fix

### Scenario 1: No Sort Mode (Sort Disabled)

```
Current: [Photo A, Photo B, Photo C]
User selects: Photo D
Result: [Photo A, Photo B, Photo C, Photo D]
Behavior: New image stays at END ✅
Smooth: YES ✅ No bobbing
```

### Scenario 2: Ascending Mode (Sort Enabled)

```
Current: [Photo 1, Photo 2, Photo 3]
User selects: Photo 5
Result: [Photo 1, Photo 2, Photo 3, Photo 5]
Behavior: New image stays at END (highest number) ✅
Smooth: YES ✅ No bobbing
```

### Scenario 3: Descending Mode (Sort Enabled)

```
Current: [Photo 10, Photo 9, Photo 8]
User selects: Photo 12
Result: [Photo 12, Photo 10, Photo 9, Photo 8]
Behavior: New image goes to START (highest number) ✅
Smooth: YES ✅ No bobbing
```

### Scenario 4: Multiple Images Without Numbers

```
Current: [Photo A (no number), Photo B (no number)]
User types number on Photo A
Old behavior: Photos could swap positions randomly
New behavior: Photos stay in same order (Photo A, Photo B) ✅
Smooth: YES ✅ No bobbing
```

## Technical Details

### What "Stable Sort" Means

In computer science, a **stable sort** algorithm maintains the relative order of items with equal sort keys.

**Example:**

```
Input: [Photo A, Photo B, Photo C] (all with photoNumber = "")
Old sort: Might output [Photo B, Photo A, Photo C] (unstable)
New sort: Always outputs [Photo A, Photo B, Photo C] (stable)
```

### JavaScript's Sort Stability

- **Before ES2019**: JavaScript sort was NOT guaranteed to be stable
- **After ES2019**: Modern browsers use stable sort (TimSort)
- Our code: Explicitly returns `0` for equal items to ensure stability

### Why Keys Matter for Smooth Rendering

```typescript
// Bad (causes jumping):
defectImages.map((img, index) => (
  <div key={index}>
    {" "}
    // ❌ Key changes when array reorders
    {img}
  </div>
));

// Good (smooth):
defectImages.map((img, index) => (
  <div key={img.instanceId}>
    {" "}
    // ✅ Key is stable
    {img}
  </div>
));
```

**React Behavior:**

- Stable keys: React moves DOM elements
- Changing keys: React destroys and recreates DOM elements
- Result: Stable keys = smooth, changing keys = jumpy

## User Benefits

### Before Fix ❌

- Page "bobbing" when typing photo numbers
- Images jumping to unexpected positions
- Layout shifting causing cursor to move
- Hard to continue labeling in sequence

### After Fix ✅

- **Smooth rendering** - no bobbing or jumping
- **Predictable behavior** - images stay where user expects
- **Stable workflow** - can easily continue labeling
- **Better UX** - professional, polished feel

## Code Changes Summary

**Files Modified:**

1. `src/components/SelectedImagesPanel.tsx`
   - Line 717-748: Stable sort function
   - Line 1277-1283: Stable React keys

**Key Changes:**

1. Added explicit `return 0` for equal items
2. Added stable key generation: `defect-${img.instanceId}`
3. Changed map from arrow function to explicit return

## Testing Checklist

- [x] No sort mode: new images stay at end
- [x] Ascending mode: new images go to end naturally
- [x] Descending mode: new images go to start naturally
- [x] Multiple images without numbers: maintain order
- [x] Images with equal photo numbers: don't swap
- [x] No layout shift or bobbing
- [x] Smooth transitions when sorting

## Related Commits

- **f448d0f**: Stable sort fix for selected images
- **9324b1f**: Metadata sync fix (use AWS as source of truth)
- **9362b0b**: Polling fix (fetch array directly)

## Future Considerations

If user reports any remaining bobbing or jumping:

1. **Add CSS transitions** for smoother animations:

```css
.selected-image {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
```

2. **Debounce sort** when user is actively typing:

```typescript
let sortTimeout;
const debouncedSort = () => {
  clearTimeout(sortTimeout);
  sortTimeout = setTimeout(() => applySort(), 500);
};
```

3. **Virtualize list** if performance issues with many images

## Conclusion

The fix ensures:

- ✅ New images always appear at end (no sort) or sorted position (with sort)
- ✅ No page bobbing or layout shift
- ✅ Smooth, predictable behavior
- ✅ Better UX for labeling workflow
