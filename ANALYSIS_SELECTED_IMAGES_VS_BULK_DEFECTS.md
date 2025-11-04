# Analysis: Selected Images vs Bulk Defects - Component Coupling Issue

## Executive Summary

**The Problem:** `SelectedImagesPanel` and `BulkTextInput` are **tightly coupled** and both manipulate the same `bulkDefects` state, causing conflicts and unexpected behavior. Changes to bulk defects have been inadvertently affecting selected images functionality.

## Key Findings

### 1. **Two Different State Systems (But They Overlap)**

#### `selectedImages` (Images Mode)
- **Type:** `Array<{ id: string; instanceId: string; fileName?: string }>`
- **Purpose:** Used when `viewMode === 'images'`
- **Data Source:** User selects images from grid, each gets a unique `instanceId`
- **Metadata Storage:** Uses `instanceMetadata[instanceId]` object for photo numbers and descriptions
- **Location:** `src/store/metadataStore.ts` line 516

#### `bulkSelectedImages` (Bulk Mode)
- **Type:** `string[]` (array of image IDs)
- **Purpose:** Used when `viewMode === 'bulk'`
- **Data Source:** User selects images, tracked by base image `id` only
- **Metadata Storage:** Uses `bulkDefects[]` array where each defect has `selectedFile`, `photoNumber`, `description`
- **Location:** `src/store/metadataStore.ts` line 517

#### `bulkDefects` (Shared State - THE PROBLEM)
- **Type:** `Array<BulkDefect>` where `BulkDefect` has:
  - `id: string`
  - `photoNumber: string`
  - `description: string`
  - `selectedFile: string` (filename)
- **Purpose:** Stores bulk defect data
- **Used By:** BOTH `SelectedImagesPanel` AND `BulkTextInput`
- **Location:** `src/store/metadataStore.ts` line 521

### 2. **Component Rendering Structure**

```
SelectedImagesPanel (always rendered)
├── viewMode === 'images' → Shows selectedImages with instanceMetadata
└── viewMode === 'bulk' → Renders BulkTextInput component (line 1451-1454)
    └── BulkTextInput (conditionally rendered inside SelectedImagesPanel)
```

**Critical Issue:** `SelectedImagesPanel` renders `BulkTextInput` when in bulk mode, BUT it also has its own bulk defect handling logic!

### 3. **Duplicate Undo Functions**

Both components have their own `undoDelete` functions that manipulate `bulkDefects`:

#### `SelectedImagesPanel.undoDelete()` (lines 456-531)
- Located in `SelectedImagesPanel.tsx`
- Called when `viewMode === 'bulk'` AND undo button clicked (line 1116, 1227)
- Directly manipulates `bulkDefects` via `setBulkDefects`
- Uses `isUndoingRef` and `isUndoingGlobal` flags

#### `BulkTextInput.undoDelete()` (lines 530-601)
- Located in `BulkTextInput.tsx`
- Also manipulates `bulkDefects` via `setBulkDefects`
- Uses `isUndoing` ref and `isUndoingGlobal` flag
- **BUT:** This function is never directly called from UI! It's only used internally.

**The Problem:** When `viewMode === 'bulk'`, `SelectedImagesPanel` renders `BulkTextInput`, but the undo button in `SelectedImagesPanel`'s header calls `SelectedImagesPanel.undoDelete()`, NOT `BulkTextInput.undoDelete()`. This creates duplicate logic.

### 4. **Shared Global Flag Confusion**

Both components use `isUndoingGlobal` to prevent auto-sort interference:
- `BulkTextInput` exports: `export let isUndoingGlobal = false;` (line 80)
- `SelectedImagesPanel` imports: `import { isUndoingGlobal } from './BulkTextInput';` (line 2)
- Both set this flag during undo operations
- Both check this flag in auto-sort `useEffect` hooks

**This coupling was necessary** because both components need to prevent auto-sort during undo, but it's a code smell indicating tight coupling.

### 5. **How SelectedImagesPanel Handles Bulk Mode**

When `viewMode === 'bulk'`, `SelectedImagesPanel`:

1. **Renders BulkTextInput** (line 1451-1454)
2. **BUT also has its own logic for bulk mode:**
   - `getImageNumber()` checks `bulkDefects` when `viewMode === 'bulk'` (line 722-726)
   - `getImageDescription()` checks `bulkDefects` when `viewMode === 'bulk'` (line 737-741)
   - `undoDelete()` manipulates `bulkDefects` (line 456-531)
   - `handleDeleteAllBulk()` deletes all bulk defects
   - Header undo button calls `undoDelete` when `viewMode === 'bulk'` (line 1116)

3. **Uses `bulkSelectedImages`** for selection tracking (line 695-716)

### 6. **The Root Cause: Since Commit aa47501**

Commit `aa47501` ("Fix: Clear stale selections in initial load when migration success rate is low") modified `metadataStore.ts` to handle selection clearing. This may have introduced changes to how `selectedImages` and `bulkSelectedImages` interact.

**However, the real issue is architectural:**

Since you started making changes to bulk defects, both components have been:
- Manipulating the same `bulkDefects` state
- Implementing duplicate undo logic
- Sharing global flags
- Competing for control over the same data

## Specific Problems Identified

### Problem 1: Duplicate Undo Logic
- `SelectedImagesPanel.undoDelete()` and `BulkTextInput.undoDelete()` both do the same thing
- They both insert, renumber, and restore defects
- Changes to one require changes to the other (hence the duplication fixes)

### Problem 2: State Ownership Confusion
- Who owns `bulkDefects`? Both components think they do
- `SelectedImagesPanel` renders `BulkTextInput` but also manages bulk defects itself
- This creates a parent-child conflict

### Problem 3: Conditional Rendering Creates Dual Control
```
SelectedImagesPanel (parent)
├── Has undo button in header (line 1116)
├── Calls undoDelete() when viewMode === 'bulk'
├── Renders BulkTextInput (child)
│   └── BulkTextInput has its own undoDelete() but it's not used!
└── Both manipulate bulkDefects
```

### Problem 4: Shared Global Flag Indicates Tight Coupling
- `isUndoingGlobal` is a band-aid solution
- It works but indicates architectural coupling
- Both components must coordinate via this shared variable

## What Should Happen (Architectural Fix)

### Option 1: Single Responsibility (Recommended)
- **SelectedImagesPanel** should ONLY handle `selectedImages` (images mode)
- **BulkTextInput** should ONLY handle `bulkDefects` (bulk mode)
- Remove all bulk defect logic from `SelectedImagesPanel`
- When `viewMode === 'bulk'`, `SelectedImagesPanel` should ONLY render `BulkTextInput` and delegate all control

### Option 2: Consolidate Logic
- Move all bulk defect logic into `BulkTextInput`
- `SelectedImagesPanel` becomes a pure wrapper that conditionally renders
- Remove duplicate undo functions

### Option 3: Extract Shared Logic
- Create a shared `useBulkDefects` hook
- Both components use the hook
- Single source of truth for bulk defect operations

## Current State: Why It's Working (But Fragile)

Currently, it works because:
1. When `viewMode === 'bulk'`, `SelectedImagesPanel` renders `BulkTextInput`
2. The undo button in `SelectedImagesPanel` header calls `SelectedImagesPanel.undoDelete()`
3. `BulkTextInput.undoDelete()` exists but is never called from UI
4. Both functions do the same thing, so it doesn't matter which one runs
5. The shared `isUndoingGlobal` flag prevents race conditions

**But this is fragile because:**
- Any change to bulk defect logic requires updating two places
- The code is confusing (why does `BulkTextInput` have an unused undo function?)
- Future changes could break the synchronization

## Recommendations

1. **Immediate:** Remove duplicate `undoDelete` from `BulkTextInput` OR `SelectedImagesPanel` (choose one)
2. **Short-term:** Move all bulk defect operations to `BulkTextInput`, make `SelectedImagesPanel` a pure wrapper
3. **Long-term:** Refactor to clear separation of concerns:
   - `SelectedImagesPanel` = images mode only
   - `BulkTextInput` = bulk mode only
   - Shared utilities/hooks for common operations

## Files Affected

- `src/components/SelectedImagesPanel.tsx` - Has bulk defect logic (shouldn't)
- `src/components/BulkTextInput.tsx` - Has bulk defect logic (correct)
- `src/store/metadataStore.ts` - Manages both `selectedImages` and `bulkDefects`
- Both components share `isUndoingGlobal` flag

## Conclusion

**Yes, SelectedImagesPanel and BulkTextInput are different systems**, but they've become **coupled through shared state** (`bulkDefects`). Since commit `aa47501`, changes to bulk defects have been affecting selected images because:

1. Both components manipulate the same `bulkDefects` array
2. `SelectedImagesPanel` has bulk defect logic even though it renders `BulkTextInput`
3. Duplicate undo functions create maintenance burden
4. Shared global flags indicate tight coupling

**The fix:** Separate concerns - `SelectedImagesPanel` should delegate ALL bulk defect operations to `BulkTextInput` when in bulk mode.

