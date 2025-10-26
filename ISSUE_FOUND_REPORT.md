# 🔍 Issue Found - Selected Images Not Persisting Properly

**Date**: October 26, 2025  
**User Report**: Selected images flicker on first refresh, disappear on third refresh, second selection disappears

---

## User's Exact Feedback

> "When I tested , the selected images flickered on the first refresh, on the three refrehe it dissapeared including a second selection . retest again considering my feedback and make sure your refresh three times and change tabs. then go thorugh the entire code. cross browsesr also does not persist"

---

## Issue Confirmed

From the latest browser test:
- Console shows: `⚠️ No selectedImages found in storage or empty array`
- This is from `loadUserData` at line 1659 of `metadataStore.ts`
- The condition `selectionsResult.value.length > 0` fails

---

## Root Cause

Looking at `loadUserData` in `metadataStore.ts` (line 1646):

```typescript
if (selectionsResult.status === 'fulfilled' && selectionsResult.value && selectionsResult.value.length > 0) {
  console.log('📥 Loaded selectedImages from storage:', selectionsResult.value);
  // ... migrate and apply
} else {
  console.log('⚠️ No selectedImages found in storage or empty array');
}
```

**The problem**: The code loads from `loadVersionedData(projectKeys.selections)` which returns an array. If no data exists, it returns `[]` (empty array), which fails the `length > 0` check.

However, the UI still shows old data because of the previous successful selection. When refreshing, the migration fails because there's no valid data in localStorage to match against.

---

## What Needs to be Fixed

1. **Check what's actually in localStorage** - need to see what `loadVersionedData` is returning
2. **The migration logic** - might be returning empty array when it should return matched items
3. **Race condition** - selections saved before images are loaded, so migration fails

---

## Next Steps

1. Add detailed logging to see what's in localStorage
2. Check if the issue is with `loadVersionedData` returning empty array vs null
3. Review the entire flow: save → load → migrate → apply

