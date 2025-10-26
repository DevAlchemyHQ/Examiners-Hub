# Test Instructions - Selected Images Persistence

**Deployment**: Commit `96b781f` - FIX: Add detailed logging for filename comparison  
**Status**: Ready for testing

---

## What Was Fixed

1. **Store fileName directly in selectedImages** (Commit `5e15a8f`)
   - Modified `toggleImageSelection` to include `fileName` in the selected array
   - Modified `setSelectedImages` to preserve `fileName` when available
   - Updated interface to include `fileName?: string`

2. **Improved migration logic** (Commit `fa0f68e`)
   - Prioritizes `fileName` property over ID parsing
   - Added detailed logging

3. **Added filename comparison logging** (Commit `96b781f`)
   - Shows extracted fileName
   - Shows final selectedFileName
   - Shows comparison results

---

## How to Test

1. **Navigate to**: https://main.d32is7ul5okd2c.amplifyapp.com
2. **Login** with: timndg@gmail.com / testtest11
3. **Select an image** from the grid
4. **Add photo number** (e.g., "123")
5. **Add description** (e.g., "Test description")
6. **Refresh the page** (F5)
7. **Check if**:
   - ✅ Image persists in selected tile
   - ✅ Photo number persists
   - ✅ Description persists

---

## What to Look For in Console

**Good Signs**:
```
🔧 toggleImageSelection - Added image: {id: ..., instanceId: ..., fileName: PB080001 copy.JPG}
📝 Extracted fileName from selected item: PB080001 copy.JPG
✅ Final selectedFileName: PB080001 copy.JPG
🔍 Comparing: {selected: pb080001copyjpg, loaded: pb080001copyjpg, match: true}
✅ Found matching image by filename
✅ Migrated selections applied: 1
```

**Bad Signs**:
```
fileName: unknown
⚠️ Could not migrate selected image
🔄 Migration complete. Migrated 0 out of 1 selected images
```

---

## Test Multiple Refresh Cycles

1. Refresh 3-5 times
2. Verify persistence each time
3. Check console logs for any failures

---

## Expected Behavior

After each refresh:
- Selected image should appear in the tile
- Photo number should be preserved
- Description should be preserved
- No console errors
- Counter should show correct count

---

## If It Still Fails

Check the console logs for:
1. What `fileName` is extracted
2. What the comparison shows
3. Why the match fails

This will help identify the exact issue.

