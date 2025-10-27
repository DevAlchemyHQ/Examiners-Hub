# Analysis of Bug - Image Selection Positioning

## Issue Report
User reported:
1. "When I delete selected tabs, they're still reappear again" - deletion not working
2. "When I tried to add description, even it jumps" - images jumping when editing description

## Root Cause Analysis

### The Problem

The user wants:
- **Descending mode + NEW image (no photo number)**: Should appear at START (before photo #5)
- **Ascending mode + NEW image (no photo number)**: Should appear at END (after photo #5)
- **No sort mode + NEW image**: Should appear at END

But the current sort algorithm has this logic:
```typescript
// Put images without numbers at the end
if (aNum === 0) return 1;
if (bNum === 0) return -1;
```

This means:
- NEW images (without numbers) always go to the END
- Even in descending mode, they go to end
- This overrides the insertion position from `toggleImageSelection`

### Current Flow

1. User selects image in descending mode
2. `toggleImageSelection` inserts at START: `[newImage, ...existing]` ✅
3. `sortImages` is called with descending direction
4. `sortImages` sees newImage has no number (aNum === 0)
5. Returns 1, which moves it to END ❌

### The Real Issue

The sort algorithm is reordering items based on photo numbers, which OVERRIDES the insertion position.

**What we need:**
- If NO sort direction → don't sort, return as-is
- If sort direction is active:
  - Items WITH photo numbers → sort by number
  - Items WITHOUT photo numbers → DO NOT REORDER, keep insertion position

## Proposed Solution

The sort should NOT move items without numbers to end. Instead:
- In descending mode: items without numbers should stay wherever they were inserted (START for new items)
- In ascending mode: items without numbers should stay wherever they were inserted (END for new items)

But this contradicts the requirement that items without numbers should go to the end.

## The Real Requirement

Looking at user's request again:
> "when I select a new image, you should come before number 5 and when it's on ascending order, if I have the last image selected, select the image, number five should appear at the end of number five"

So the requirement is:
- **Descending + NEW image (no number)**: Should appear BEFORE highest numbered item
- **Ascending + NEW image (no number)**: Should appear AFTER highest numbered item

But if they appear at START/END initially, then the sort algorithm should NOT move them!

## Solution

Do NOT apply sort to items without numbers. Only sort items that have photo numbers.

```typescript
// Only sort items that both have photo numbers
if (aNum === 0 && bNum === 0) return 0; // Keep insertion order
if (aNum === 0) return 0; // Don't move items without numbers
if (bNum === 0) return 0; // Don't move items without numbers
// Sort by photo number
const sorted = direction === 'asc' ? aNum - bNum : bNum - aNum;
return sorted;
```

This way:
- Items without numbers stay where inserted
- Items with numbers get sorted
- New items maintain their START/END position

