# Certainty Assessment - Selected Images Persistence Fix

## How Certain Am I?

### High Certainty (90%+) - Fix 1: userSpecificKeys → projectKeys

**Issue**: `userSpecificKeys.images` is undefined, causing images loading to fail  
**Fix**: Replace with `projectKeys.images` (which is defined at line 1406)  
**Certainty**: 95% this is broken and will be fixed

**Reason**: `userSpecificKeys` variable doesn't exist in `loadUserData` scope. Code references it but it's never defined. This WILL cause errors. Using `projectKeys` (which IS defined) will fix it.

---

### Medium-High Certainty (75-85%) - Fix 2: Versioned Format Consistency

**Issue**: Images use raw JSON, selections use versioned format  
**Current State**:

- Images SAVE with: `localStorage.setItem(keys.images, JSON.stringify(combined))` (line 719)
- Images LOAD with: `localStorage.getItem(userSpecificKeys.images)` + `JSON.parse()`
- Selections SAVE with: `saveVersionedData(keys.selections, projectId, userId, newSelected)` (line 1058)
- Selections LOAD with: `loadVersionedData(projectKeys.selections)` (line 1555)

**Problem**:

- Selections are being SAVED in versioned format: `{version, timestamp, projectId, userId, data: [...]}`
- But when loading, if the versioned data exists but `.data` is `[]`, we get empty array
- OR if the data isn't being saved at all, we get `null` → returns `[]`

**Certainty**: 80% this is the issue

**Evidence from console logs**:

```
✅ Versioned data saved: project_proj_6c894ef_selections (v2)  ← Saving works
📥 Loaded selectedImages from storage: []                       ← Loading returns []
```

**This means**:

- Data IS being saved (we see the success message)
- But `.data` field is `[]` (empty array)
- OR the save isn't actually working despite the log

**Proposed Fix 2: Two options**

**Option A: Make EVERYTHING use versioned format**

- Images: Change line 719 to use `saveVersionedData()`
- Images: Change lines 1534, 1543 to use `loadVersionedData()`
- Certainty: 85% this will work (makes everything consistent)

**Option B: Keep images as raw JSON, make selections work like images**

- Revert selections to raw JSON parsing
- Certainty: 70% this will work (inconsistent but might work)

**Recommendation**: Option A - make everything consistent with versioned format

---

### Medium Certainty (70%) - Fix 3: Empty Array Handling

**Issue**: When `selectionsResult.value` is `[]`, we clear the state  
**Fix**: Only update if we have actual data  
**Certainty**: 70% this helps

**Why not 100%**: The real issue is WHY it's loading as `[]`. This is a safety net, not the root cause.

---

## What to Expect After the Fix

### Scenario 1: All Fixes Applied (Expected)

**Immediate outcome**:

1. ✅ Images load successfully (Fix 1 fixes undefined variable)
2. ✅ Selected images load from versioned format (Fix 2A)
3. ✅ Empty selections don't clear existing state (Fix 3)

**Expected behavior**:

1. Select image → Appears in selected images tile ✅
2. Add description → Saves to localStorage + AWS ✅
3. Refresh page → Selection persists ✅
4. Edit description again → Still persists ✅
5. Cross-browser → Selections sync to other browser ✅

**Console logs expected**:

```
✅ Versioned data loaded: project_proj_6c894ef_selections (v2)
📥 Loaded selectedImages from storage: [{id: "img_123", instanceId: "img_456"}]
```

### Scenario 2: Only Fix 1 Applied (Partial)

**Risk**: Images might work, but selected images still won't persist  
**Reason**: Format mismatch remains

### Scenario 3: Fix 1 + Fix 2A (High Confidence)

**Expected**: This should fix it  
**Certainty**: 85% confident

**If it doesn't work, likely causes**:

1. Data corruption in localStorage (old inconsistent data)
2. AWS data structure issue
3. Migration logic failing

### Scenario 4: Fix 1 + Fix 2B (Medium Confidence)

**Expected**: Might work, but inconsistent format  
**Certainty**: 70% confident

## Final Recommendation

**Implement all 3 fixes** in this order:

1. Fix 1 (certainty: 95%)
2. Fix 2 Option A - versioned format everywhere (certainty: 85%)
3. Fix 3 - empty array protection (certainty: 70%)

**Expected Success Rate**: 85%

**If it doesn't work, next steps**:

1. Check localStorage to see what data is actually stored
2. Add more console logging to trace save/load flow
3. Check if `saveVersionedData` is being called with correct parameters

## Testing Plan After Fix

1. Clear browser localStorage
2. Select an image
3. Check console for "Versioned data saved" message
4. Check console for localStorage key content
5. Refresh page
6. Check console for "Versioned data loaded" message
7. Verify selection persisted
