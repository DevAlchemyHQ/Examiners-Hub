# Urgent Fix Status

## Issues Identified

### 1. Ascending Sort: New Images Not at END
**Problem:** User says ascending works like descending
**Expected:** New images should appear at END (after highest number)
**Current:** Appearing at START (before highest number)

**Root Cause:** Sort logic was changed in commit 5c8baed to return 0 for items without numbers, preventing proper positioning

### 2. No Sort: New Images Not at END  
**Problem:** User says works like descending
**Expected:** New images should appear at END (right side)
**Current:** Also appearing incorrectly

### 3. Editing Metadata: Images Move to Middle
**Problem:** When editing on no sorter, images move to middle
**Expected:** Images should stay in place
**Root Cause:** Sort algorithm is reordering even when sort is OFF

## Fix Applied

**File:** `src/components/SelectedImagesPanel.tsx` lines 738-739

**Change:**
```typescript
// BEFORE (commit 5c8baed - BROKEN)
if (aNum === 0) return 0;  // Don't move
if (bNum === 0) return 0;  // Don't move

// AFTER (RESTORED WORKING VERSION)
if (aNum === 0) return 1;  // Put at end
if (bNum === 0) return -1; // Put at start (relative)
```

This restores the original working behavior from commit f448d0f.

