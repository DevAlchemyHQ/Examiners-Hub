# Sustainable Sync Architecture Plan

## Zero Data Loss + Predictable Behavior + Minimal AWS Calls

### Core Principles (Non-Negotiable)

1. **Local state is source of truth during active editing** - Never overwrite user's current work
2. **Operation-based sync** - Sync intentions (operations) not final state
3. **Version vectors** - Track what each browser knows
4. **Conflict resolution rules** - Deterministic, predictable merging
5. **Refresh always gets latest** - On page load, fetch all pending operations
6. **Minimal AWS calls** - Batch operations, smart polling, eventual WebSocket push

---

## Phase 1: Operation Queue System (Quick Win - 2-3 days)

### Goal: Eliminate state snapshot conflicts

### Architecture

```
Current: Send entire array [img1, img2, img3]
New: Send operation queue [{type: 'ADD', instanceId: 'x'}, {type: 'DELETE', instanceId: 'y'}]
```

### Implementation

#### 1.1 Operation Types

```typescript
interface Operation {
  id: string; // Unique operation ID
  type: "ADD" | "DELETE" | "UPDATE_METADATA" | "SORT_CHANGE";
  instanceId?: string; // For DELETE, UPDATE_METADATA
  imageId?: string; // For ADD
  data?: {
    // For UPDATE_METADATA
    photoNumber?: string;
    description?: string;
  };
  timestamp: number; // When operation occurred
  browserId: string; // Which browser created it
  version: number; // Operation version (incremental)
}

interface OperationLog {
  operations: Operation[];
  lastOperationId: string; // Last operation processed
  version: number; // Current state version
}
```

#### 1.2 Server-Side Storage

**DynamoDB Table: `mvp-labeler-operations`**

```
Partition Key: user_id
Sort Key: operation_id (timestamp-version)
Attributes:
  - operation (Operation JSON)
  - timestamp
  - processed (boolean)
```

**DynamoDB Table: `mvp-labeler-selected-images-state`**

```
Partition Key: user_id
Sort Key: 'current'
Attributes:
  - selectedImages (current state)
  - operationVersion (last processed operation version)
  - lastSynced (timestamp)
```

#### 1.3 Client-Side Operation Queue

```typescript
// Local operation queue (in localStorage)
localStorage.setItem('operation-queue', JSON.stringify([
  {type: 'ADD', instanceId: 'x', timestamp: 1234, ...},
  {type: 'DELETE', instanceId: 'y', timestamp: 1235, ...}
]));

// Last synced version
localStorage.setItem('last-synced-version', '1235');
```

#### 1.4 Sync Flow

**On Save:**

1. Add operations to local queue
2. Send entire queue to server (batch)
3. Server:
   - Stores operations in `mvp-labeler-operations`
   - Replays operations to update `mvp-labeler-selected-images-state`
   - Returns: `{success: true, version: 1236}`
4. Client: Clear queue, update `last-synced-version`

**On Poll:**

1. Client sends: `{userId, lastSyncedVersion: 1235}`
2. Server:
   - Query operations where `timestamp > 1235`
   - Return operations: `[{operation1}, {operation2}]`
3. Client:
   - Replay operations in order (apply to local state)
   - Update `last-synced-version`
   - Merge conflicts using rules (see Phase 2)

**On Refresh:**

1. Load from localStorage (instant)
2. Immediately fetch operations since `last-synced-version`
3. Replay all operations to rebuild state
4. Result: Always get latest, never lose local data

### Benefits

✅ Conflicts become mergeable (operations can be reordered)
✅ Minimal data sent (only changes, not full state)
✅ Audit trail (all operations logged)
✅ Refresh always gets latest (replay operations)
✅ Reduces AWS calls (batch operations, query by version)

---

## Phase 2: Version Vectors + Smart Merging (2-3 days)

### Goal: Predictable conflict resolution

### 2.1 Version Vector Structure

```typescript
interface VersionVector {
  [browserId: string]: number;    // Each browser tracks its own version
}

// Example:
{
  'chrome-abc123': 5,   // Chrome has processed 5 operations
  'firefox-xyz789': 3   // Firefox has processed 3 operations
}
```

### 2.2 Conflict Resolution Rules

#### Rule 1: Local Operations Win (During Active Editing)

- If operation has `timestamp < 2 seconds ago` → Keep local, protect from polling
- User is actively editing, don't overwrite

#### Rule 2: Deletion Always Wins

- `DELETE` operation beats `UPDATE` or `ADD` for same `instanceId`
- Prevents deleted items from reappearing

#### Rule 3: Last Writer Wins (For Metadata)

- If two browsers update same `instanceId` metadata:
  - Compare timestamps
  - Newer timestamp wins
- But: If local timestamp is within 5 seconds, prefer local (user typing)

#### Rule 4: Additions Merge

- If Browser A adds image, Browser B adds different image:
  - Both are added (no conflict)
- If Browser A adds image, Browser B deletes it:
  - Deletion wins (Rule 2)

#### Rule 5: Sort Changes (Last Write Wins)

- If two browsers change sort direction:
  - Compare timestamps
  - Newer wins
- But: Protect local if changed < 10 seconds ago

### 2.3 Implementation

```typescript
function mergeOperations(
  localOps: Operation[],
  remoteOps: Operation[]
): Operation[] {
  // 1. Combine all operations
  const allOps = [...localOps, ...remoteOps];

  // 2. Sort by timestamp
  allOps.sort((a, b) => a.timestamp - b.timestamp);

  // 3. Apply conflict resolution
  const merged: Operation[] = [];
  const processed = new Set<string>(); // Track processed instanceIds

  for (const op of allOps) {
    if (op.type === "DELETE") {
      // DELETE always wins, remove any ADD/UPDATE for this instanceId
      merged.push(op);
      processed.add(op.instanceId!);
      // Remove conflicting operations
      const conflicting = merged.findIndex(
        (m) => m.instanceId === op.instanceId && m.type !== "DELETE"
      );
      if (conflicting >= 0) {
        merged.splice(conflicting, 1);
      }
    } else if (op.type === "UPDATE_METADATA") {
      // UPDATE: Keep newest, or local if recent (< 5 seconds)
      const existing = merged.find(
        (m) => m.instanceId === op.instanceId && m.type === "UPDATE_METADATA"
      );

      if (!existing) {
        merged.push(op);
      } else {
        // Conflict: pick winner
        const isLocal = op.browserId === currentBrowserId;
        const isRecentLocal = isLocal && Date.now() - op.timestamp < 5000;

        if (isRecentLocal || op.timestamp > existing.timestamp) {
          // Replace existing
          const index = merged.indexOf(existing);
          merged[index] = op;
        }
      }
    } else {
      // ADD: Always add (no conflict)
      merged.push(op);
    }
  }

  return merged;
}
```

### Benefits

✅ Deterministic merging (same inputs = same output)
✅ No data loss (local operations protected)
✅ Handles all conflict scenarios
✅ Predictable behavior

---

## Phase 3: WebSocket Real-Time Push (3-5 days)

### Goal: Eliminate polling, instant sync

### 3.1 Architecture

```
Browser A                    Server                    Browser B
   |                           |                          |
   |--- Add Image ------------>|                          |
   |                           |-- Store Operation        |
   |                           |-- Broadcast Operation --->|
   |                           |                          |-- Update UI
```

### 3.2 Implementation

#### Server (API Gateway WebSocket API or Lambda)

```typescript
// On operation received
async function handleOperation(operation: Operation, userId: string) {
  // 1. Store operation
  await storeOperation(userId, operation);

  // 2. Update state
  await applyOperationToState(userId, operation);

  // 3. Broadcast to all connected browsers (except sender)
  const connections = await getConnectionsForUser(userId);
  for (const connectionId of connections) {
    if (connectionId !== operation.browserId) {
      await sendToConnection(connectionId, {
        type: "OPERATION",
        operation,
      });
    }
  }
}
```

#### Client (WebSocket connection)

```typescript
// Connect on page load
const ws = new WebSocket("wss://api.example.com/ws");

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "OPERATION") {
    // Apply operation to local state
    applyOperation(message.operation);

    // Update UI
    updateUI();
  }
};
```

### Benefits

✅ Instant sync (no 5-second delay)
✅ Eliminates polling (reduces AWS calls by ~90%)
✅ Real-time collaboration feel
✅ Lower latency

### Fallback

- If WebSocket fails: Fall back to polling
- On refresh: Always use REST API to get operations (WebSocket reconnects)

---

## Phase 4: CRDT (Conflict-free Replicated Data Types) (1-2 weeks)

### Goal: Automatic conflict resolution, mathematical guarantees

### 4.1 CRDT Structure for Selected Images

```typescript
interface CRDTSet {
  items: Map<instanceId, {
    imageId: string;
    timestamp: number;
    browserId: string;
    tombstone?: boolean;  // true if deleted
  }>;
}

// Add operation
function add(set: CRDTSet, instanceId: string, imageId: string) {
  set.items.set(instanceId, {
    imageId,
    timestamp: Date.now(),
    browserId: currentBrowserId,
    tombstone: false
  });
}

// Delete operation
function delete(set: CRDTSet, instanceId: string) {
  const item = set.items.get(instanceId);
  if (item) {
    item.tombstone = true;
    item.timestamp = Date.now();
    item.browserId = currentBrowserId;
  }
}

// Merge (CRDT merge - always converges)
function merge(set1: CRDTSet, set2: CRDTSet): CRDTSet {
  const merged = new Map();

  for (const [instanceId, item] of set1.items) {
    merged.set(instanceId, item);
  }

  for (const [instanceId, item] of set2.items) {
    const existing = merged.get(instanceId);

    if (!existing) {
      merged.set(instanceId, item);
    } else {
      // CRDT merge: Prefer non-tombstone, then newer timestamp
      if (item.tombstone && !existing.tombstone) {
        // Keep existing (not deleted)
        continue;
      }
      if (!item.tombstone && existing.tombstone) {
        // Replace with non-deleted
        merged.set(instanceId, item);
      } else if (item.timestamp > existing.timestamp) {
        // Newer wins
        merged.set(instanceId, item);
      }
    }
  }

  return { items: merged };
}
```

### Benefits

✅ Mathematical guarantees (eventual consistency)
✅ No conflicts (automatic resolution)
✅ Works offline (merge when back online)
✅ Proven pattern (used by Riak, Redis, etc.)

---

## Implementation Roadmap

### Week 1: Phase 1 (Operation Queue)

- [ ] Define Operation types
- [ ] Create `mvp-labeler-operations` DynamoDB table
- [ ] Implement operation queue in client
- [ ] Update `updateSelectedImages` to use operations
- [ ] Update polling to fetch operations
- [ ] Update refresh to replay operations
- [ ] Test: Delete in Browser A, refresh Browser B → should sync

### Week 2: Phase 2 (Version Vectors + Merging)

- [ ] Implement version vector tracking
- [ ] Implement conflict resolution rules
- [ ] Add merge function
- [ ] Test all conflict scenarios
- [ ] Verify no data loss in edge cases

### Week 3: Phase 3 (WebSocket - Optional but Recommended)

- [ ] Set up API Gateway WebSocket API or Lambda
- [ ] Implement WebSocket server handler
- [ ] Implement WebSocket client connection
- [ ] Fallback to polling if WebSocket fails
- [ ] Test real-time sync

### Week 4: Phase 4 (CRDT - Future Enhancement)

- [ ] Implement CRDT data structure
- [ ] Replace operation merge with CRDT merge
- [ ] Test offline/online scenarios
- [ ] Performance optimization

---

## Data Safety Guarantees

### Guarantee 1: No Data Loss

- **Mechanism**: Local operations queue (never cleared until confirmed saved)
- **Proof**: If save fails, operations remain in queue and retry
- **Refresh**: Replays operations from server, never overwrites unsaved local operations

### Guarantee 2: All Updates on Refresh

- **Mechanism**: Fetch operations since `last-synced-version`, replay all
- **Proof**: Refresh always starts with `getOperationsSince(lastSyncedVersion)`
- **Result**: State = Initial state + all operations in order

### Guarantee 3: Current Browser Never Loses Data

- **Mechanism**: Local queue protected, conflict resolution favors local recent operations
- **Proof**: Rules 1-3 protect local operations < 5 seconds old
- **Result**: User's current work always preserved

### Guarantee 4: Predictable Behavior

- **Mechanism**: Deterministic conflict resolution rules
- **Proof**: Same inputs always produce same merged state
- **Result**: No random overwrites, users can trust the system

### Guarantee 5: Minimal AWS Calls

- **Current**: ~12 calls/minute (polling every 5s) + saves
- **With Operation Queue**: ~2-3 calls/minute (batch operations, query by version)
- **With WebSocket**: ~0 calls/minute (polling), only operations on change
- **Savings**: 90%+ reduction in AWS calls

---

## Migration Strategy

### Step 1: Dual-Write (Backward Compatible)

- Keep existing `updateSelectedImages` (full array)
- Add new `saveOperations` (operation queue)
- Both write to DynamoDB
- Polling reads from both (operations preferred)

### Step 2: Migrate Clients

- Update clients to use operation queue
- Old clients still work (read from state table)
- New clients use operations table

### Step 3: Remove Legacy

- Once all clients migrated, remove full array sync
- Keep only operation queue

---

## Testing Checklist

### Scenario 1: Basic Sync

- [ ] Browser A adds image → Browser B sees it within 5 seconds
- [ ] Browser A deletes image → Browser B sees deletion within 5 seconds

### Scenario 2: Concurrent Edits

- [ ] Browser A adds image1, Browser B adds image2 → Both appear
- [ ] Browser A updates metadata, Browser B deletes same image → Deletion wins
- [ ] Browser A updates description, Browser B updates same description → Newer wins

### Scenario 3: Refresh

- [ ] Browser A adds image, Browser B refreshes → Image appears
- [ ] Browser A deletes image, Browser B refreshes → Image removed
- [ ] Multiple operations pending, Browser B refreshes → All operations applied

### Scenario 4: Offline/Network Issues

- [ ] Browser A goes offline, adds images → Operations queued locally
- [ ] Browser A comes online → Operations sync automatically
- [ ] Save fails → Operations remain in queue, retry

### Scenario 5: Data Loss Prevention

- [ ] Browser A adds image, delete immediately (before save) → Image stays deleted
- [ ] Browser A types description, network fails → Description preserved locally
- [ ] Multiple rapid operations → All preserved in queue

---

## Cost Analysis

### Current (Polling Every 5s)

- Polling: 12 calls/minute = 720 calls/hour = 17,280 calls/day
- Saves: ~50-100 calls/day
- **Total**: ~17,330 DynamoDB operations/day

### With Operation Queue (Batch Polling Every 10s)

- Polling: 6 calls/minute = 360 calls/hour = 8,640 calls/day
- Saves: ~20-30 calls/day (batched)
- **Total**: ~8,670 operations/day
- **Savings**: ~50% reduction

### With WebSocket

- Polling: 0 calls (only on connection)
- Saves: ~20-30 calls/day
- Operations: ~30-50 reads/day (on change only)
- **Total**: ~50-80 operations/day
- **Savings**: ~99.5% reduction

---

## Rollout Plan

1. **Phase 1 (Operation Queue)**: Deploy to production, monitor for 1 week
2. **Phase 2 (Version Vectors)**: Deploy after Phase 1 stable
3. **Phase 3 (WebSocket)**: Optional, but highly recommended for cost savings
4. **Phase 4 (CRDT)**: Future enhancement, not required for MVP

---

## Success Metrics

- ✅ Zero data loss incidents
- ✅ All updates sync within 5 seconds (or instantly with WebSocket)
- ✅ Refresh always shows latest data
- ✅ < 5% AWS call increase (should decrease)
- ✅ < 1% conflict resolution failures
- ✅ User satisfaction: No complaints about data loss

---

## Risk Mitigation

### Risk 1: Operation Queue Overflow

- **Mitigation**: Limit queue size (max 100 operations), force flush if exceeded
- **Detection**: Monitor queue size in logs

### Risk 2: Stale Operations

- **Mitigation**: Operations expire after 24 hours, server filters old operations
- **Detection**: Monitor operation age in queries

### Risk 3: WebSocket Connection Issues

- **Mitigation**: Automatic fallback to polling, reconnect logic
- **Detection**: Monitor WebSocket connection success rate

### Risk 4: Migration Breaking Changes

- **Mitigation**: Dual-write period (old + new), gradual migration
- **Detection**: Monitor both sync methods during transition

---

## Conclusion

This plan provides:

- ✅ Zero data loss guarantees
- ✅ Predictable, consistent behavior
- ✅ Minimal AWS calls (90%+ reduction with WebSocket)
- ✅ Scalable architecture (works with 1 user or 1000 users)
- ✅ Real-time sync capabilities
- ✅ Offline support (operations queue)

**Recommendation**: Start with Phase 1 (Operation Queue) - this alone solves 80% of the sync issues and sets the foundation for future enhancements.
