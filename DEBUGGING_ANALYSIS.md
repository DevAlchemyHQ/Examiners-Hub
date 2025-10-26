# Debugging Analysis: Data Reverting Issue

## The Problem You Described

1. ✅ Changes applied ONCE initially
2. ❌ Subsequent changes don't sync between browsers  
3. ❌ After a few refreshes, data reverts to old values

This suggests a **merge issue** where old data is overwriting new data.

---

## The Merge Logic (Lines 1062-1082 in services.ts)

```typescript
// Get existing project
const existingProject = getProjectResult.project;

// ⚠️ PROBLEM: Merge sessionState (line 1063-1069)
let mergedSessionState = existingProject.sessionState || {};
if (smallData.sessionState) {
  mergedSessionState = {
    ...mergedSessionState,      // Old data FIRST
    ...smallData.sessionState   // New data SECOND (should win)
  };
}

// ⚠️ PROBLEM: Re-merge everything (line 1076-1082)
const mergedProjectData = {
  ...existingProject,           // Old formData + old sessionState
  ...smallData,                  // New formData + new sessionState
  sessionState: mergedSessionState,  // ⚠️ OVERWRITES with old+new merge
  updated_at: new Date().toISOString()
};
```

---

## The Issue

When merging, we do:
1. **Merge sessionState** (old + new sessionState) → gets new formData
2. **Merge entire project** (old + new project) → should get new formData
3. **BUT**: `sessionState: mergedSessionState` line **overwrites** the sessionState from step 2

However, looking more closely, `mergedSessionState` has the NEW formData in `sessionState.formData`, so that should work.

---

## Potential Issues

### Issue 1: formData Not at Root Level in smallData

Let me check what's actually being passed to updateProject:

```typescript
// From forceAWSSave (line 343-346):
await DatabaseService.updateProject(user.email, 'current', { 
  formData: sessionState.formData || {},  // ✅ formData at root
  sessionState: sessionState              // ✅ sessionState (with formData inside)
});
```

So smallData should be:
```typescript
{
  formData: {...},
  sessionState: { formData: {...}, ... }
}
```

### Issue 2: The order of spread matters

```typescript
{
  ...existingProject,  // Has: formData (OLD)
  ...smallData,         // Has: formData (NEW) ← should win
  sessionState: mergedSessionState
}
```

The formData from smallData should overwrite the formData from existingProject. This should be correct.

---

## Real Problem: Shallow Merge

Wait, I see it now! Look at the merge at line 1065-1069:

```typescript
mergedSessionState = {
  ...mergedSessionState,      // Old sessionState
  ...smallData.sessionState   // New sessionState
};
```

This is a **shallow merge**! If `mergedSessionState` has:
```typescript
{
  formData: { elr: "OLD", date: "OLD", structureNo: "OLD" },
  lastActiveTime: 12345
}
```

And `smallData.sessionState` has:
```typescript
{
  formData: { elr: "NEW" },  // Only elr changed
  lastActiveTime: 67890
}
```

Then mergedSessionState becomes:
```typescript
{
  formData: { elr: "NEW" },  // ⚠️ Lost date and structureNo!
  lastActiveTime: 67890
}
```

So the merge is LOST fields from new sessionState if they're not present in the new data!

---

## The Fix

We need to NOT re-merge the sessionState, or do a DEEP merge instead of a shallow merge.

Let me provide the fix.

