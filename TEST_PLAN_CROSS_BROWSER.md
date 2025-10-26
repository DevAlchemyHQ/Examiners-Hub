# Cross-Browser Sync Test Plan

## Current Status After Fix

✅ **Code deployed**: Commit `dbc64d5`  
✅ **Data migrated**: DynamoDB now uses `proj_6c894ef`  
✅ **Console confirms**: "🔑 Using deterministic projectId: proj_6c894ef"

---

## What Should Happen Now

### Before (Broken)

```
Browser 1: Reads proj_6c894ef (localStorage) + "current" (AWS) → Different data
Browser 2: Reads proj_6c894ef (localStorage) + "current" (AWS) → Different data
Result: Each browser shows different values ❌
```

### After (Fixed)

```
Browser 1: Reads proj_6c894ef (localStorage) + proj_6c894ef (AWS) → Same project!
Browser 2: Reads proj_6c894ef (localStorage) + proj_6c894ef (AWS) → Same project!
Result: Both browsers show SAME values ✅
```

---

## Testing Steps

### Step 1: Clear old data (to start fresh)

**Option A**: In Chrome DevTools:

```javascript
// Clear localStorage for form data
localStorage.removeItem("project_proj_6c894ef_formData");
localStorage.removeItem("project_proj_6c894ef_formData-session-state");
```

**Option B**: Refresh both browsers and enter new values

### Step 2: Enter data in Browser 1

1. Open Chrome
2. Enter ELR="TEST1"
3. Enter No="111"
4. Enter Date="2025-01-15"
5. Wait 5 seconds

### Step 3: Check Browser 2

1. Open Firefox
2. Refresh the page
3. **Expected**: Should show ELR="TEST1", No="111", Date="2025-01-15" ✅

### Step 4: Update in Browser 2

1. In Firefox, enter ELR="TEST2"
2. Enter No="222"
3. Wait 5 seconds

### Step 5: Check Browser 1

1. Go back to Chrome
2. Refresh the page
3. **Expected**: Should show ELR="TEST2", No="222" ✅

### Step 6: Update again in Browser 1

1. In Chrome, enter ELR="TEST3"
2. Wait 5 seconds
3. Refresh Browser 2
4. **Expected**: Should show ELR="TEST3" (NOT reverting to TEST2) ✅

---

## Expected Console Logs (When Working)

### On Page Load:

```
🔑 Using deterministic projectId: proj_6c894ef
✅ Found current project for user: timndg@gmail.com
✅ Form data loaded from AWS
```

### When Saving:

```
🔑 Using deterministic projectId for update: proj_6c894ef
✅ Updated current project successfully
```

### When Loading (Cross-Browser):

```
🔑 Using deterministic projectId: proj_6c894ef
✅ Found current project with data from other browser
```

---

## What to Check

1. **Same project_id in all browsers**: Look for "proj_6c894ef" in console
2. **No old project_id**: Should NOT see "current" being used for AWS
3. **Data syncs**: Changes in one browser appear in others
4. **No data reverting**: Subsequent changes persist

---

## If Test Fails

Check console logs for:

- Is "🔑 Using deterministic projectId: proj_6c894ef" shown?
- Is there only ONE project in DynamoDB with proj_6c894ef?
- Are timestamps being compared correctly?
