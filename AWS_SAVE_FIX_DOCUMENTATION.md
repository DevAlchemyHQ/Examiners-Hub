# AWS Save Fix - Prevent Empty Arrays

**Commit**: `a0afe1a`  
**Date**: October 26, 2025  
**Status**: Deployed

---

## Problem

Empty selections arrays were being saved to AWS, which then synced to other browsers and cleared their selections.

### Scenario:
1. User A selects image → saves to AWS
2. User B refreshes → gets selection from AWS ✅
3. User A clears selections → saves `[]` to AWS
4. User B refreshes → gets `[]` from AWS → selection disappears ❌

---

## Root Cause

In `toggleImageSelection` (lines 1083-1124), the code was saving selections to AWS **even when the array was empty**:

```typescript
// Before
await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
// This runs even when selectedWithInstanceIds = []
```

---

## The Fix

### File: `src/store/metadataStore.ts` (Lines 1083-1124)

**Added check before saving to AWS**:
```typescript
// Only save if we have actual selections
if (newSelected.length === 0) {
  console.log('⏸️ No selections to save to AWS');
  return;
}

// Continue with AWS save...
await DatabaseService.updateSelectedImages(user.email, selectedWithInstanceIds);
```

---

## What Changed

### Before:
- Any action on selections → saves to AWS (even empty array)
- Empty array syncs to other browsers → clears their selections

### After:
- Only saves to AWS when `newSelected.length > 0`
- Empty arrays never saved to AWS
- Other browsers don't get empty arrays
- Selections persist across refreshes

---

## How It Works Now

### When User Selects Image:
1. `toggleImageSelection` called
2. `newSelected = [{ id, instanceId, fileName }]` (length = 1)
3. Save to localStorage ✅
4. **Check**: `length === 0`? No → continue
5. Save to AWS ✅
6. Other browsers get update ✅

### When User Clears Selections:
1. `toggleImageSelection` called (remove from array)
2. `newSelected = []` (length = 0)
3. Save empty array to localStorage
4. **Check**: `length === 0`? Yes → **return early** ✅
5. **NOT saved to AWS** ✅
6. Other browsers keep their selections ✅

---

## Related Commits

- `c8462f6` - CRITICAL FIX: Prevent AWS from overwriting localStorage with empty selections array
- `a0afe1a` - FIX: Prevent saving empty selections array to AWS - only save when selections exist
- `55277f9` - FIX: Preserve selections even when migration returns empty array + add fileName to migrated selections
- `454eec0` - DEBUG: Add detailed logging for selected images loading

---

## Testing

After deployment, test this scenario:

1. Browser A: Select an image, add metadata
2. Browser A: Refresh → selection persists ✅
3. Browser B: Open app → see selection from AWS ✅
4. Browser B: Refresh → selection still persists ✅
5. Browser A: Clear selection
6. Browser B: Refresh → **selection should still be there** ✅ (not cleared by AWS)

---

## Console Logs

Look for this when clearing selections:

```
⏸️ No selections to save to AWS
```

This is **expected** and means the fix is working correctly.

---

## Status

✅ Fix applied and deployed  
⏳ Ready for testing in ~3 minutes

