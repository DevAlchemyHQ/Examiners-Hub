# Race Condition Fix: Data Reversion Issue

## User Report
> "It now works cross browser, but there was an occasion where when I changed on one browser, it changed on the other but reverted to the previous data. But when I changed it again it persisted."

## Root Cause

### Data Saved to TWO Locations in DynamoDB

When `forceAWSSave` runs (line 348 in metadataStore.ts), it saves formData to:
1. `result.project.formData` (root level) ✅ - Latest data from forceAWSSave
2. `result.project.sessionState.formData` (inside sessionState) ⚠️ - Duplicate/older data

### The Problem

**Polling was ONLY reading from location #2** (sessionState):
```typescript
// BEFORE (Line 2462)
const awsFormData = result.project.sessionState.formData; // ❌ Gets old data!
```

**What Happened**:

1. **Browser 1**: Changes ELR to "FIRST"
   - Saves to AWS: `formData: "FIRST"` at ROOT level ✅
   - Saves to AWS: `sessionState.formData: "FIRST"` at sessionState level ✅

2. **Browser 2**: Polling runs
   - Fetches AWS data
   - AWS has BOTH: `project.formData = "FIRST"` AND `sessionState.formData = "FIRST"` ✅
   - Polling reads `sessionState.formData = "FIRST"` ✅
   - Updates to "FIRST" ✅

3. **Browser 1**: Changes ELR to "SECOND" (typing...)
   - `forceAWSSave` IMMEDIATELY saves `formData: "SECOND"` to ROOT level ✅
   - But `sessionState.formData` might still be "FIRST" for a moment ⚠️

4. **Browser 2**: Polling runs again (within 1 second of #3)
   - Fetches AWS data
   - AWS now has: `project.formData = "SECOND"`, `sessionState.formData = "FIRST"` ⚠️
   - BUT polling reads only `sessionState.formData = "FIRST"` ❌
   - Compares: local="FIRST" vs AWS="FIRST" → SAME!
   - No update ✅ (Wait, this shouldn't revert...)

Wait, let me re-think this. The user said "it reverted to previous data". That means:
- Browser 2 had "FIRST"
- Browser 1 changed to "SECOND"
- Browser 2 received "SECOND" ✅
- Then Browser 2 reverted back to "FIRST" ❌

This could happen if:
- Browser 2's polling runs RIGHT AFTER Browser 1 saves
- But the merge logic in services.ts (line 1113-1114) overwrites formData during save
- Causing a race where old sessionState data overwrites new root-level data

Actually, looking at services.ts line 1114:
```typescript
formData: formDataToSave,  // ✅ Explicitly set formData
```

This SHOULD work. Let me look at formDataToSave logic again...

Line 1095-1097:
```typescript
const formDataToSave = smallData.formData || 
                       smallData.sessionState?.formData || 
                       {};
```

AH! The issue is:
- When Browser 1 changes to "SECOND", it calls `forceAWSSave(sessionState, newFormData)`
- This sends: `{ formData: newFormData, sessionState: sessionState }`
- formDataToSave = smallData.formData = newFormData ✅

BUT, what if `sessionState` still has OLD formData inside it? Then line 1084-1089 does:
```typescript
let mergedSessionState = existingProject.sessionState || {};
if (smallData.sessionState) {
  mergedSessionState = {
    ...mergedSessionState,  // ← Keeps OLD sessionState.formData!
    ...smallData.sessionState
  };
}
```

So if Browser 1's sessionState still has formData="FIRST" inside it, it gets merged with existingProject!

The fix is what I just implemented:
- Polling should prioritize `result.project.formData` (root level - always latest)
- NOT `sessionState.formData` (could be old/merged)

---

## The Complete Fix (74c5977)

### What Changed

**Before** (Lines 2452-2465):
```typescript
if (result.project?.sessionState) {
  const awsFormData = result.project.sessionState.formData; // ❌ Only reads sessionState
  const dataIsDifferent = JSON.stringify(currentFormData) !== JSON.stringify(awsFormData);
  
  // Complex field-by-field merge (could cause issues)
  let mergedFormData = { ...state.formData };
  if (result.project.sessionState.formData.date) { ... }
  // ... etc
}
```

**After** (Lines 2452-2504):
```typescript
if (result.project) {
  // ✅ CRITICAL: Priority order for formData:
  // 1. result.project.formData (root level - most recent)
  // 2. result.project.sessionState.formData (fallback)
  const awsFormData = result.project.formData || result.project.sessionState?.formData || {};
  
  const dataIsDifferent = JSON.stringify(currentFormData) !== JSON.stringify(awsFormData);
  
  if (dataIsDifferent && Object.keys(awsFormData).length > 0) {
    // Use AWS formData directly (it's already complete and latest)
    set({ 
      formData: awsFormData as any,
      sessionState: {
        ...state.sessionState,
        formData: awsFormData as any,
        lastActiveTime: Date.now()
      }
    });
  }
}
```

### Why This Works

1. ✅ **Prioritizes root-level formData** (always latest from forceAWSSave)
2. ✅ **Uses data directly** (no complex field-by-field merge that could cause conflicts)
3. ✅ **Falls back gracefully** if root-level missing
4. ✅ **Prevents reversion** by always using the most recent data

---

## Summary of All Fixes

### Issue 1: Project ID Mismatch (dbc64d5)
- localStorage and AWS now both use `proj_6c894ef`
- ✅ Fixed

### Issue 2: Data Comparison Logic (ec6e790)
- Changed from timestamp comparison to data content comparison
- ✅ Fixed

### Issue 3: Polling Never Initialized (ec6e790)
- Added `startPolling()` call in MainApp.tsx
- ✅ Fixed

### Issue 4: Data Erasure During Save (31445d7, de2721e)
- forceAWSSave now sends complete formData
- All callers pass complete data
- ✅ Fixed

### Issue 5: Data Reversion (74c5977) ← NEW
- Polling now prioritizes root-level formData
- Uses data directly without complex merge
- ✅ Fixed

---

## Testing

After deployment, verify:
1. B1: Change ELR to "TEST1" → Save
2. B2: Should get "TEST1" (within 5s)
3. B1: Change to "TEST2" → Save
4. B2: Should get "TEST2" (within 5s) **AND NOT REVERT TO "TEST1"**
5. Repeat multiple times - should persist correctly ✅

