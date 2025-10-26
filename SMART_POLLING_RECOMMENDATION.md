# Smart Polling Recommendation for AWS Cost Optimization

## Current Costs

- **Polling**: Every 5 seconds = 12 reads/min = 720 reads/hour per user
- **If 100 active users**: 72,000 reads/hour = ~$0.07/hour (DynamoDB read units)
- **Monthly**: ~$50-100 for polling alone

## Recommended: Smart Polling (Option 1)

### Implementation

```typescript
let lastPollTime = 0;
const POLL_INTERVAL_MS = 15000; // Increased to 15 seconds
const VISIBILITY_CHECK = true; // Only poll when visible

startPolling: () => {
  const pollInterval = setInterval(async () => {
    // Skip if tab is hidden
    if (document.hidden) {
      console.log("⏸️ [POLLING] Tab hidden, skipping");
      return;
    }

    const now = Date.now();
    const timeSinceLastPoll = now - lastPollTime;

    // Skip if polled recently
    if (timeSinceLastPoll < POLL_INTERVAL_MS) {
      console.log("⏸️ [POLLING] Too soon since last poll");
      return;
    }

    // Skip if debounced save is pending
    if (instanceMetadataSaveTimeout) {
      console.log("⏸️ [POLLING] Debounced save pending, skipping");
      return;
    }

    // Poll AWS
    lastPollTime = now;
    console.log("🔄 [POLLING] Smart poll triggered");

    // ... existing polling logic
  }, 5000); // Still check every 5s, but don't poll if conditions not met
};
```

### Benefits

- **Reduces AWS calls by 40-60%**
- Automatic sync still works
- Only polls when tab is visible
- Skips during debounce window
- No infrastructure changes needed

### Cost Savings

- Before: 720 reads/hour/user
- After: ~300 reads/hour/user (60% reduction)
- **Monthly savings**: $30-50 for 100 users

## Alternative: Hybrid Approach (Best UX)

### Combine Options 1 + 2:

```typescript
// 1. Smart Polling (cost efficient)
// 2. Immediate sync on visibility change
// 3. Manual refresh button option

startPolling: () => {
  // Smart polling (reduced frequency)
  const pollInterval = setInterval(async () => {
    if (document.hidden) return; // Skip if hidden
    if (instanceMetadataSaveTimeout) return; // Skip if debouncing
    if (Date.now() - lastPollTime < 15000) return; // Wait 15s

    await pollAWS();
  }, 5000); // Check conditions every 5s

  // Immediate sync when tab becomes visible
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      console.log("👁️ Tab visible - immediate sync");
      pollAWS();
    }
  });

  // Manual refresh button (UI addition)
  // User can click to force sync
};
```

### Features

✅ Automatic sync (every 15s when visible)  
✅ Immediate sync on tab focus  
✅ Manual refresh option  
✅ 60-70% cost reduction  
✅ Better UX (faster when returning to tab)

## Comparison

| Approach           | AWS Calls/Hour | Syncing Speed   | UX Score  |
| ------------------ | -------------- | --------------- | --------- |
| Current (5s poll)  | 720            | Fast            | Good      |
| Smart Poll (15s)   | ~240           | Medium          | Good      |
| Smart + Visibility | ~180           | Fast on focus   | Excellent |
| Event-driven       | ~50            | Instant         | Excellent |
| Manual only        | 0 (load only)  | User-controlled | Fair      |

## My Recommendation

**Implement Smart Polling with Visibility Check**:

1. Poll every 15 seconds instead of 5
2. Skip polling when tab is hidden
3. Skip polling when debounce is active
4. Add immediate sync when tab becomes visible
5. Consider adding manual refresh button

**Expected Result**:

- 70% fewer AWS calls
- Instant sync when user returns to tab
- No loss of functionality
- Better cost efficiency
