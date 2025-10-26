# Cross-Browser Persistence Test Plan

## Current Form Data State (Chrome)

- **ELR**: TEST01
- **Structure No**: xcvcxv
- **Date**: 2025-10-26

**Timestamp**: October 26, 2025, 11:15 AM
**AWS Save Status**: ✅ Confirmed saved successfully

---

## Test Procedure: Verify Data Persists Across Browsers

### Step 1: Wait for AWS Sync (Already Complete)

✅ Data saved to AWS (confirmed by console logs)

### Step 2: Open Firefox (or Different Browser)

1. Launch Firefox browser
2. Navigate to: https://main.d32is7ul5okd2c.amplifyapp.com
3. Log in with credentials:
   - Email: timndg@gmail.com
   - Password: testtest11

### Step 3: Verify Form Data Loads from AWS

**Expected Result**: Form fields should show:

- ELR: TEST01
- Structure No: xcvcxv
- Date: 2025-10-26

### Step 4: Check Console Logs in Firefox

Look for these key logs:

```
✅ Form data loaded from AWS
✅ Session state loaded from AWS
📋 Project data loaded from AWS
```

### Step 5: Test Bidirectional Sync

1. In **Firefox**, update ELR to: `FIREFOX_TEST`
2. Wait 5 seconds
3. Open **Chrome** (refresh the tab)
4. **Expected**: ELR should show `FIREFOX_TEST`

---

## Console Evidence of AWS Save

From Chrome console (just now):

```
✅ [IMMEDIATE] Session state forced to AWS successfully
✅ Form data force saved to AWS
✅ Updated most recent project successfully with merged data
✅ Form data and session state saved to AWS
```

**Project ID**: proj_6c894ef
**User**: timndg@gmail.com

---

## Test Checklist

- [ ] Chrome: Data saved to AWS (✅ DONE)
- [ ] Firefox: Open app and verify form data loads
- [ ] Firefox: Check console for "Form data loaded from AWS"
- [ ] Firefox: Update a field
- [ ] Chrome: Refresh and verify updates sync
- [ ] Verify date format remains YYYY-MM-DD in Firefox

---

## Expected Behavior

### If Polling is Active:

Form data should sync within **5-10 seconds** between browsers via AWS polling.

### If Polling is Not Active:

Data will persist but won't sync automatically. Users would need to refresh to see changes from another browser.

**Note**: The `startPolling()` action needs to be initialized in App.tsx for automatic syncing (see APP_POLLING_INIT.md).

---

## Current Architecture

1. **localStorage**: Immediate, same-browser persistence
2. **BroadcastChannel**: Real-time cross-tab sync
3. **AWS DynamoDB**: Cross-browser persistence (requires load on new session)
4. **AWS Polling** (optional): Automatic cross-browser sync every 5 seconds

---

## How to Run the Cross-Browser Test

1. **Keep Chrome open** with current session
2. **Open Firefox** and navigate to the app
3. **Log in** with the same credentials
4. **Check form fields** - should match Chrome data
5. **Update a field** in Firefox (e.g., change ELR)
6. **Wait 5-10 seconds**
7. **Refresh Chrome** tab - should see Firefox changes

---

## Success Criteria

✅ Form data persists across browsers  
✅ Date format remains YYYY-MM-DD  
✅ All fields (elr, structureNo, date) sync correctly  
✅ Console logs show AWS load and save operations  
✅ Changes in one browser appear in another (with or without polling)
