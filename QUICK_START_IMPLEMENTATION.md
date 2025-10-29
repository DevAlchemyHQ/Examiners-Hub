# Quick Start: Operation Queue Implementation

## Immediate Steps to Fix Sync Issues (2-3 Days)

### Current Problem

- Full state snapshots cause conflicts
- Polling overwrites local changes
- Refresh doesn't get latest data
- Too many AWS calls

### Solution: Operation Queue (Phase 1)

Switch from sending full arrays to sending operations (commands).

---

## Step 1: Define Operation Types (30 mins)

Create `src/types/operations.ts`:

```typescript
export interface Operation {
  id: string; // `${timestamp}-${browserId}-${random}`
  type:
    | "ADD_SELECTION"
    | "DELETE_SELECTION"
    | "UPDATE_METADATA"
    | "SORT_CHANGE";
  instanceId?: string; // For DELETE, UPDATE
  imageId?: string; // For ADD
  data?: {
    photoNumber?: string;
    description?: string;
    sortDirection?: "asc" | "desc" | null;
  };
  timestamp: number;
  browserId: string; // Unique browser identifier
}

export type OperationQueue = Operation[];
```

---

## Step 2: Add Operation Queue to Store (1 hour)

Update `src/store/metadataStore.ts`:

```typescript
// Add to state
interface MetadataStateOnly {
  // ... existing fields ...
  operationQueue: OperationQueue;
  lastSyncedVersion: number;
}

// Add operations instead of direct state changes
toggleImageSelection: (id) => {
  set((state) => {
    const instanceId = generateStableImageId(...);
    const operation: Operation = {
      id: `${Date.now()}-${getBrowserId()}-${Math.random()}`,
      type: 'ADD_SELECTION',
      instanceId,
      imageId: id,
      timestamp: Date.now(),
      browserId: getBrowserId()
    };

    // Add to queue
    const newQueue = [...state.operationQueue, operation];

    // Apply operation locally (optimistic update)
    const newSelected = [...state.selectedImages, {id, instanceId, fileName}];

    return {
      selectedImages: newSelected,
      operationQueue: newQueue
    };
  });
}
```

---

## Step 3: Modify Save to Send Operations (1 hour)

Update save logic in `setSelectedImages`:

```typescript
// Instead of sending full array, send operation queue
if (operationQueue.length > 0) {
  // Batch save operations
  await DatabaseService.saveOperations(user.email, operationQueue);

  // Get back version number
  const result = await DatabaseService.saveOperations(...);

  // Clear queue, update version
  set({
    operationQueue: [],
    lastSyncedVersion: result.lastVersion
  });

  // Save version to localStorage
  localStorage.setItem('last-synced-version', result.lastVersion);
}
```

---

## Step 4: Create Server Endpoints (2 hours)

Update `src/lib/services.ts`:

```typescript
// Save operations
static async saveOperations(userId: string, operations: Operation[]) {
  // 1. Store operations in DynamoDB
  const putRequests = operations.map(op => ({
    PutRequest: {
      Item: {
        user_id: userId,
        operation_id: op.id,
        operation: op,
        timestamp: op.timestamp,
        processed: false
      }
    }
  }));

  // Batch write (25 at a time)
  await batchWrite('mvp-labeler-operations', putRequests);

  // 2. Apply operations to current state
  const currentState = await getSelectedImagesState(userId);
  let updatedState = currentState;

  for (const op of operations) {
    updatedState = applyOperation(updatedState, op);
  }

  // 3. Save updated state
  await updateSelectedImagesState(userId, updatedState);

  // 4. Return version
  return { lastVersion: Date.now() };
}

// Get operations since version
static async getOperationsSince(userId: string, sinceVersion: number): Promise<Operation[]> {
  // Query operations table where timestamp > sinceVersion
  const query = new QueryCommand({
    TableName: 'mvp-labeler-operations',
    KeyConditionExpression: 'user_id = :userId AND timestamp > :since',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':since': sinceVersion
    }
  });

  const result = await docClient.send(query);
  return result.Items.map(item => item.operation);
}
```

---

## Step 5: Update Polling to Fetch Operations (1 hour)

Update `startPolling` in `metadataStore.ts`:

```typescript
startPolling: () => {
  const pollInterval = setInterval(async () => {
    try {
      const userId = getUserId();
      const state = get();
      const lastVersion = state.lastSyncedVersion || 0;

      // Get operations since last sync
      const operations = await DatabaseService.getOperationsSince(
        userId,
        lastVersion
      );

      if (operations.length > 0) {
        // Apply operations to local state
        const mergedState = mergeOperations(state, operations);

        // Update state
        set(mergedState);

        // Update last synced version
        const newVersion = Math.max(...operations.map((op) => op.timestamp));
        set({ lastSyncedVersion: newVersion });
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  }, 10000); // Poll every 10 seconds (reduced from 5)
};
```

---

## Step 6: Replay Operations on Refresh (30 mins)

Update `loadUserData` in `metadataStore.ts`:

```typescript
loadUserData: async () => {
  // 1. Load from localStorage (instant)
  const localData = loadVersionedData(...);
  set(localData);

  // 2. Immediately fetch operations since last sync
  const userId = getUserId();
  const lastVersion = localStorage.getItem('last-synced-version') || 0;
  const operations = await DatabaseService.getOperationsSince(userId, lastVersion);

  // 3. Replay operations to rebuild state
  const currentState = get();
  let rebuiltState = currentState;

  for (const op of operations) {
    rebuiltState = applyOperation(rebuiltState, op);
  }

  // 4. Update state
  set(rebuiltState);

  // 5. Update version
  set({ lastSyncedVersion: Math.max(...operations.map(op => op.timestamp)) });
}
```

---

## Step 7: Conflict Resolution Helper (1 hour)

Create `src/utils/operationMerge.ts`:

```typescript
function applyOperation(state: MetadataState, op: Operation): MetadataState {
  switch (op.type) {
    case "ADD_SELECTION":
      // Only add if doesn't exist
      if (
        !state.selectedImages.find((item) => item.instanceId === op.instanceId)
      ) {
        return {
          ...state,
          selectedImages: [
            ...state.selectedImages,
            {
              id: op.imageId!,
              instanceId: op.instanceId!,
              fileName: "unknown", // Will be filled from images
            },
          ],
        };
      }
      return state;

    case "DELETE_SELECTION":
      return {
        ...state,
        selectedImages: state.selectedImages.filter(
          (item) => item.instanceId !== op.instanceId
        ),
      };

    case "UPDATE_METADATA":
      // Check if local is newer (protect recent edits)
      const localMeta = state.instanceMetadata[op.instanceId!];
      const isLocalNewer =
        localMeta?.lastModified && localMeta.lastModified > op.timestamp;

      if (isLocalNewer) {
        // Keep local (user is actively editing)
        return state;
      }

      // Apply remote update
      return {
        ...state,
        instanceMetadata: {
          ...state.instanceMetadata,
          [op.instanceId!]: {
            ...localMeta,
            ...op.data,
            lastModified: op.timestamp,
          },
        },
      };

    default:
      return state;
  }
}

function mergeOperations(
  localOps: Operation[],
  remoteOps: Operation[]
): Operation[] {
  // Combine and sort by timestamp
  const allOps = [...localOps, ...remoteOps].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // Remove duplicates (same operation ID)
  const seen = new Set<string>();
  return allOps.filter((op) => {
    if (seen.has(op.id)) return false;
    seen.add(op.id);
    return true;
  });
}
```

---

## Step 8: Helper Functions (30 mins)

```typescript
// Get unique browser ID (persist in localStorage)
function getBrowserId(): string {
  let browserId = localStorage.getItem("browser-id");
  if (!browserId) {
    browserId = `browser-${Date.now()}-${Math.random()}`;
    localStorage.setItem("browser-id", browserId);
  }
  return browserId;
}

// Apply operation to state (used in merge)
function applyOperation(state: MetadataState, op: Operation): MetadataState {
  // Implementation from Step 7
}
```

---

## Testing Checklist

### Test 1: Basic Operation Queue

- [ ] Add image → Operation added to queue
- [ ] Save → Operations sent to server
- [ ] Queue cleared after successful save

### Test 2: Polling

- [ ] Browser A adds image → Browser B sees it within 10 seconds
- [ ] Operations applied in correct order

### Test 3: Refresh

- [ ] Browser A adds image
- [ ] Browser B refreshes → Image appears
- [ ] Last synced version updated

### Test 4: Conflict Resolution

- [ ] Browser A deletes image
- [ ] Browser B updates same image metadata
- [ ] Deletion wins (correct behavior)

### Test 5: Data Loss Prevention

- [ ] Add image, delete immediately (before save)
- [ ] Both operations in queue
- [ ] Save sends both → Server processes in order
- [ ] Final state: image deleted (correct)

---

## Rollout Order

1. **Day 1**: Steps 1-3 (Operation types, queue in store, save logic)
2. **Day 2**: Steps 4-5 (Server endpoints, polling update)
3. **Day 3**: Steps 6-8 (Refresh replay, conflict resolution, testing)

---

## Success Criteria

✅ Add image on Browser A → Appears on Browser B within 10 seconds
✅ Delete image → Stays deleted (doesn't revert)
✅ Refresh → Always shows latest data
✅ No data loss during rapid operations
✅ AWS calls reduced by ~50%

---

## Next Steps (After Phase 1)

- Phase 2: Version vectors for more sophisticated conflict resolution
- Phase 3: WebSocket for real-time push (eliminates polling)
- Phase 4: CRDT for mathematical guarantees

---

## Important Notes

1. **Backward Compatibility**: During migration, support both full array sync and operations
2. **Error Handling**: If save fails, keep operations in queue and retry
3. **Queue Size Limit**: Max 100 operations, force flush if exceeded
4. **Operation Expiry**: Server filters operations older than 24 hours
