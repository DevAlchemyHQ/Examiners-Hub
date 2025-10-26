# Cross-Browser Sync Testing Plan

## Overview

This document outlines testing procedures to verify that form data (date, elr, structureNo) syncs correctly across browsers (Chrome, Firefox, Safari) and across tabs within the same browser.

## Test Scenarios

### Test 1: Same Browser - Multiple Tabs (BroadcastChannel Sync)

**Objective**: Verify form data syncs across tabs in the same browser using BroadcastChannel.

**Steps**:

1. Open Chrome and log in to the app
2. Open the form fields (ELR, Structure No, Date)
3. Fill in:
   - ELR: `TEST01`
   - Structure No: `12345`
   - Date: `2025-10-26`
4. Open a second tab with the same app
5. Verify the form data appears automatically in the second tab
6. Modify the date to `2025-10-27` in the second tab
7. Verify the date updates in the first tab within 1-2 seconds
8. Check console logs for:
   - `📡 Form data broadcast sent via minimal sync`
   - `📅 Date standardization`
   - `🔄 Timestamp comparison`
   - `✅ Updating form data from other tab`

**Expected Results**:

- Form data syncs immediately between tabs
- Date is standardized to YYYY-MM-DD format
- Toast notification appears: "Form data synced from another tab"
- All console logs show successful sync

### Test 2: Cross-Browser Sync (AWS DynamoDB)

**Objective**: Verify form data syncs across different browsers using AWS DynamoDB.

**Steps**:

1. Open Chrome, log in, fill form with ELR=`CHROME01`, Structure No=`111`, Date=`2025-10-26`
2. Wait 5 seconds (polling interval)
3. Open Firefox, log in to same account
4. Wait 5 seconds for polling to check AWS
5. Verify form data appears in Firefox:
   - ELR: `CHROME01`
   - Structure No: `111`
   - Date: `2025-10-26`
6. In Firefox, update ELR to `FIREFOX02`
7. Wait 5 seconds
8. In Chrome, wait 5 seconds and check if ELR updated to `FIREFOX02`
9. Check console logs for:
   - `🔄 [POLLING] Checking AWS for newer form data`
   - `✅ [POLLING] Found newer form data on AWS`
   - Toast notification: "Form data synced from cloud"

**Expected Results**:

- Form data syncs within 10 seconds (2 polling cycles)
- Date remains in YYYY-MM-DD format
- All fields (elr, structureNo, date) sync correctly
- Toast notification appears for successful syncs

### Test 3: Date Format Standardization

**Objective**: Verify dates are standardized to YYYY-MM-DD format across all browsers.

**Steps**:

1. In Chrome, enter various date formats:
   - `10/26/2025`
   - `26-10-2025`
   - `Oct 26, 2025`
   - `2025-10-26`
2. Check console logs for:
   - `📅 Date standardization: { original: '...', standardized: '2025-10-26' }`
3. Verify all dates are stored as `2025-10-26`
4. Test cross-browser sync to Firefox with non-standard date
5. Verify Firefox receives standardized date format

**Expected Results**:

- All date formats convert to YYYY-MM-DD
- Console shows standardization process
- Cross-browser sync uses standardized format

### Test 4: Timestamp Collision Prevention

**Objective**: Verify random offset prevents timestamp collisions.

**Steps**:

1. In Chrome, rapidly enter form data 10 times
2. Check console logs for:
   - `🕐 Generated timestamp with random offset`
3. Verify all timestamps are different
4. Test concurrent edits across tabs
5. Verify timestamp comparison logic works correctly
6. Check for no lost updates

**Expected Results**:

- Each save generates unique timestamp
- Console shows random offset (0-10 range)
- No collisions occur
- Most recent data always wins in conflicts

### Test 5: localStorage + Storage Event Sync

**Objective**: Verify localStorage changes trigger storage event listener.

**Steps**:

1. Open Chrome with app in two tabs
2. In Tab 1, update ELR to `TAB1_ELR`
3. Manually update localStorage with session state (using dev tools)
4. Verify Tab 2 receives update via storage event
5. Check console for:
   - `📦 Storage event detected`
   - `✅ Updating form data from localStorage change`

**Expected Results**:

- localStorage changes trigger updates
- Form data merges correctly
- Toast notification appears

### Test 6: Safari Compatibility

**Objective**: Verify all sync mechanisms work in Safari.

**Steps**:

1. Open Safari, log in to app
2. Fill form with ELR=`SAFARI01`, Structure No=`999`, Date=`2025-10-26`
3. Wait 5 seconds for AWS sync
4. Open Chrome and verify data syncs
5. Test BroadcastChannel with Safari private browsing mode
6. Test localStorage with Safari

**Expected Results**:

- All sync mechanisms work in Safari
- Private browsing mode supported
- Date standardization works correctly

### Test 7: Error Handling

**Objective**: Verify error handling and toast notifications.

**Steps**:

1. Disconnect internet (offline mode)
2. Make form changes in Chrome
3. Verify error toast appears: "Failed to sync form data to cloud. Changes saved locally."
4. Reconnect internet
5. Wait 5 seconds (polling will retry)
6. Verify changes sync to AWS
7. Check console for error logs and recovery

**Expected Results**:

- Error toast appears for failed syncs
- Changes saved locally when offline
- Automatic recovery when online
- No data loss

## Debug Console Logs

During testing, monitor these console logs:

### Successful Sync Logs:

- `📝 setFormData called with data`
- `📅 Date standardization`
- `🕐 Generated timestamp with random offset`
- `📡 Form data broadcast sent via minimal sync`
- `☁️ Force saving form data to AWS`
- `✅ Form data force saved to AWS`
- `🔄 [POLLING] Checking AWS for newer form data`
- `✅ [POLLING] Found newer form data on AWS`

### Error Logs:

- `❌ Error in form data force save`
- `❌ [POLLING] Error checking AWS`
- `⚠️ Could not show error toast`

## Common Issues

### Issue 1: Date not syncing

**Symptoms**: Date appears empty or wrong in other browser
**Debug**: Check console for `📅 Date standardization` logs
**Fix**: Verify date format is being standardized

### Issue 2: Form data not updating

**Symptoms**: Changes in one browser don't appear in another
**Debug**: Check `🔄 Timestamp comparison` logs
**Fix**: Verify timestamp logic with random offset

### Issue 3: Polling not working

**Symptoms**: No AWS sync after 10 seconds
**Debug**: Check `🔄 Starting polling for AWS form data sync` log
**Fix**: Verify `startPolling()` called in App.tsx

### Issue 4: Toast notifications not showing

**Symptoms**: No user feedback on syncs
**Debug**: Check if react-toastify is imported
**Fix**: Verify toast import in metadataStore.ts

## Performance Benchmarks

- **Same-browser sync (BroadcastChannel)**: < 100ms
- **Cross-browser sync (AWS)**: < 5 seconds (one polling interval)
- **Timestamp generation**: < 10ms per save
- **Date standardization**: < 5ms per date
- **Polling overhead**: Minimal, only on save operations

## Browser Compatibility Matrix

| Feature              | Chrome | Firefox | Safari         | Edge |
| -------------------- | ------ | ------- | -------------- | ---- |
| BroadcastChannel     | ✅     | ✅      | ✅ (iOS 15.4+) | ✅   |
| localStorage sync    | ✅     | ✅      | ✅             | ✅   |
| Storage events       | ✅     | ✅      | ✅             | ✅   |
| Date standardization | ✅     | ✅      | ✅             | ✅   |
| AWS polling          | ✅     | ✅      | ✅             | ✅   |
| Toast notifications  | ✅     | ✅      | ✅             | ✅   |

## Notes

- Polling interval: 5 seconds (configurable in `startPolling()`)
- Random offset range: 0-10 (Math.random() \* 10)
- Date format: Always YYYY-MM-DD
- Conflict resolution: Highest timestamp wins
- LocalStorage fallback: Always used before AWS
