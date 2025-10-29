# FormData Sync Reliability Brainstorm

## Current Problem
- Complex merge logic with multiple conditionals
- Timestamp comparisons that might conflict
- Multiple sources of truth (root formData + sessionState.formData)
- Conditional sync decisions that might miss edge cases
- Not reliable - changes might not sync

## Goal
**FormData changes should ALWAYS, DEFINITELY sync across browsers on refresh - just like selected images do.**

---

## Option 1: Operation Queue (Recommended) ⭐
**Same reliable mechanism as selected images**

### How It Works
1. User changes ELR → Create `UPDATE_FORMDATA` operation
2. Add to operation queue (localStorage)
3. Save operations to AWS immediately
4. On refresh (Browser A/B):
   - Fetch all formData operations since last sync
   - Replay operations in order
   - Last operation wins (deterministic)

### Benefits
✅ Already proven to work (selected images use this)
✅ Deterministic - same operations = same result
✅ No complex conditionals
✅ Tracks intent, not state
✅ Last-write-wins by timestamp
✅ Handles conflicts automatically

### Implementation
```typescript
// Add to Operation type
type: "UPDATE_FORMDATA" | ...

// Operation data
data?: {
  elr?: string;
  structureNo?: string;
  date?: string;
}

// On formData change
setFormData: (data) => {
  // Create operation
  const operation: Operation = {
    id: createOperationId(browserId),
    type: 'UPDATE_FORMDATA',
    data: data, // { elr, structureNo, date }
    timestamp: Date.now(),
    browserId: browserId
  };
  
  // Add to queue & save immediately
  operationQueue.push(operation);
  saveOperations(operationQueue);
  
  // Update local state immediately (optimistic)
  set({ formData: { ...state.formData, ...data } });
}

// On refresh
loadAllUserDataFromAWS: () => {
  // Fetch operations
  const operations = await getOperationsSince(lastSyncedVersion);
  
  // Replay formData operations
  operations.filter(op => op.type === 'UPDATE_FORMDATA').forEach(op => {
    formData = { ...formData, ...op.data };
  });
}
```

---

## Option 2: Always Overwrite (Simpler, Less Ideal)
**Remove all conditionals - AWS is always source of truth on refresh**

### How It Works
1. User changes formData → Save to AWS immediately
2. On refresh → Always check AWS first
3. If AWS has values → Use AWS, period (overwrite local)
4. If AWS empty but local has values → Keep local

### Benefits
✅ Very simple logic
✅ No complex conditionals
✅ Definite behavior

### Drawbacks
❌ Might overwrite unsaved work if AWS has stale data
❌ Not as robust as operations
❌ Doesn't track individual field changes

---

## Option 3: Hybrid Approach
**Operation queue + Simple refresh logic**

### How It Works
1. Create operations for formData changes (like Option 1)
2. On refresh, always fetch and apply operations (like Option 1)
3. BUT also keep simple "AWS overwrites local if AWS has values" as backup

### Benefits
✅ Best of both worlds
✅ Operations for reliability
✅ Simple fallback if operations miss

---

## Recommendation: Option 1 (Operation Queue)

### Why?
1. **Already proven** - Selected images work perfectly with this
2. **Deterministic** - Same operations = same result, always
3. **Handles conflicts** - Last-write-wins by timestamp
4. **Tracks intent** - Knows WHAT changed, not just final state
5. **No complex logic** - Just replay operations in order

### Implementation Steps
1. Add `UPDATE_FORMDATA` to `Operation` type
2. Modify `setFormData` to create operations (like `toggleImageSelection`)
3. Modify `applyOperation` to handle `UPDATE_FORMDATA`
4. On refresh, replay formData operations (already happens in `loadAllUserDataFromAWS`)
5. Remove complex sync conditionals

### Example Flow

**Browser C: Changes ELR to "GREAT"**
```
1. User types "GREAT" in ELR field
2. setFormData({ elr: "GREAT" }) called
3. Create operation: { type: 'UPDATE_FORMDATA', data: { elr: "GREAT" }, timestamp: 1234567890 }
4. Add to operationQueue
5. Save operations to AWS immediately
6. Update local state
```

**Browser A: Refreshes**
```
1. Page loads
2. loadAllUserDataFromAWS() called
3. Fetch operations since lastSyncedVersion (includes Browser C's UPDATE_FORMDATA)
4. Replay operations: formData.elr = "GREAT"
5. Update local state
6. Form shows "GREAT" ✅
```

---

## Quick Win vs Full Implementation

### Quick Win (30 min)
- Add `UPDATE_FORMDATA` operation type
- Modify `setFormData` to create operations
- Modify `applyOperation` to handle formData
- Remove complex sync conditionals → Always replay operations

### Full Implementation (2-3 hours)
- Same as quick win +
- Better conflict resolution
- Field-level merging (if ELR changes on Browser A, structureNo on Browser B, merge both)
- Comprehensive testing

---

## What Do You Prefer?

**Option A: Operation Queue (Recommended)**
- Same system as selected images
- Most reliable, proven approach
- ~30 min to implement

**Option B: Always Overwrite (Simpler)**
- Remove all conditionals
- AWS always wins on refresh
- ~10 min to implement
- Less robust

**Option C: Something else?**
- Your ideas?

