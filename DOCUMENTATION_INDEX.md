# Documentation Index - Selected Images Fixes

## Critical Documentation Files (Read These Before Making Changes)

### 1. Root Cause Analysis
- **`ROOT_CAUSE_IDENTIFIED.md`** - Current issues and root causes
- **`REVIEW_SELECTED_IMAGES_ISSUES.md`** - All selected images issues review
- **`SELECTED_IMAGES_COMPLETE_REVIEW.md`** - Complete review since commit 956c40

### 2. Working State (Before Issues Started)
- **`SELECTED_IMAGES_COMPLETE_FIX.md`** - Last working state (commit 48567da)
- **`100_PERCENT_FIX_APPLIED.md`** - Complete fix summary
- **`SELECTED_IMAGES_PERSISTENCE_FIX.md`** - How persistence was fixed

### 3. Stable Sort Documentation
- **`STABLE_SORT_FIX_DOCUMENTATION.md`** - Stable sort algorithm explanation
- **`STABLE_SORT_TEST_RESULTS.md`** - Browser test results for stable sort
- **`COMPLETE_FIX_SUMMARY.md`** - Image selection and sorting summary

### 4. Position Fix Documentation
- **`NEW_IMAGE_SELECTION_POSITIONING_FIX.md`** - How new images are positioned
- **`DELETION_AND_SORT_FIX.md`** - Deletion and sort fix explanation
- **`FIXES_APPLIED_SUMMARY.md`** - Summary of all fixes

### 5. Recent Fixes
- **`URGENT_FIX_STATUS.md`** - Latest urgent fixes
- **`COMPLETE_FIX_STATUS.md`** - Current fix status
- **`TEST_RESULTS_AND_FIXES.md`** - Test results

### 6. Previous Commits History
- **Commit `f448d0f`** - Stable sort that worked
- **Commit `f04793f`** - New image positioning
- **Commit `48567da`** - Last working state
- **Commit `72705ca`** - Reverted to working state

## Key Learnings

### ✅ DO's
1. Always read previous documentation before making changes
2. Compare current code with working state (commit f448d0f or 72705ca)
3. Test sorting in all three modes (ascending, descending, no sort)
4. Test deletion doesn't restore items
5. Test editing metadata doesn't move images

### ❌ DON'Ts
1. Don't change sort algorithm without understanding impact
2. Don't return 0 for items without numbers (breaks positioning)
3. Don't let polling override local deletions
4. Don't modify sort without checking all three sort modes

## Sort Algorithm Rules

### Working Version (from f448d0f):
```typescript
if (aNum === 0) return 1;   // Put items without numbers at end
if (bNum === 0) return -1;  // Put items without numbers at end
```

### Broken Version (commit 5c8baed):
```typescript
if (aNum === 0) return 0;   // DON'T move - breaks positioning
if (bNum === 0) return 0;   // DON'T move - breaks positioning
```

## Current State

- **Deletion:** ✅ FIXED (commit 9a7d8e5) - Polling won't restore
- **Sorting:** ✅ FIXED (commit 853f4a8) - Restored working algorithm
- **Positioning:** Should work now with restored algorithm
- **Editing:** Should not move images anymore

## Before Making Any Changes

1. Read `DOCUMENTATION_INDEX.md` (this file)
2. Read `ROOT_CAUSE_IDENTIFIED.md`
3. Read `SELECTED_IMAGES_COMPLETE_FIX.md`
4. Compare with working commit `f448d0f`
5. Test in all three sort modes
6. Create documentation for your changes

