# Session Restoration Test Guide

## 🧪 Manual Testing Steps

### Test 1: Tab State Restoration

1. **Login to the application**
2. **Switch to the "Bulk" tab** (if not already there)
3. **Add some bulk defects** or work with existing ones
4. **Logout and log back in**
5. **Expected Result**: You should be automatically returned to the "Bulk" tab

### Test 2: Image Organization Preservation

1. **Upload some images** to the application
2. **Select multiple images** in different orders
3. **Add descriptions and photo numbers** to the selected images
4. **Logout and log back in**
5. **Expected Result**: All selected images should be restored in the same order with their descriptions and photo numbers

### Test 3: Bulk Defect Order Preservation

1. **Add several bulk defects** with different photo numbers
2. **Reorder the defects** by dragging them
3. **Logout and log back in**
4. **Expected Result**: Bulk defects should be restored in the same order you left them

### Test 4: Panel State Restoration

1. **Expand the selected images panel** to full width
2. **Logout and log back in**
3. **Expected Result**: Panel should remain expanded

### Test 5: Grid Width Preservation

1. **Change the grid width** using the +/- buttons
2. **Logout and log back in**
3. **Expected Result**: Grid width should be restored to the same setting

### Test 6: Cross-Device Persistence

1. **Work on one device** (e.g., desktop)
2. **Switch to another device** (e.g., mobile or different browser)
3. **Login on the new device**
4. **Expected Result**: All session state should be restored from the previous device

## 🔍 What to Look For

### ✅ Success Indicators:

- **Active tab is restored** - You return to the same tab you were on
- **Image selections preserved** - All selected images are still selected
- **Bulk defects in order** - Defects appear in the same order
- **Panel states restored** - Expanded/collapsed states are preserved
- **Grid width maintained** - Grid size is the same as before
- **Form data preserved** - ELR, Structure No, Date are still filled

### ❌ Failure Indicators:

- **Default tab shown** - Always returns to "Images" tab regardless of previous state
- **Missing selections** - Selected images are no longer selected
- **Wrong order** - Images or defects appear in different order
- **Reset layout** - Panel collapsed or grid width reset
- **Empty forms** - Form data is cleared

## 🐛 Debugging Tips

### Check Browser Console:

1. **Open Developer Tools** (F12)
2. **Look for session-related logs**:
   - `💾 Session state saved:`
   - `🔄 Session state restored:`
   - `🔄 Restored active tab:`

### Check localStorage:

1. **Open Developer Tools** (F12)
2. **Go to Application tab**
3. **Check localStorage** for keys like:
   - `clean-app-form-data-{email}-session-state`
   - `clean-app-form-data-{email}-viewMode`

## 📊 Expected Console Logs

When working correctly, you should see logs like:

```
💾 Session state saved: {lastActiveTab: "bulk", lastActiveTime: 1234567890, ...}
🔄 Session state restored: {lastActiveTab: "bulk", lastActiveTime: 1234567890, ...}
🔄 Restored active tab: bulk
```

## 🎯 Test Results

If all tests pass, the session restoration system is working correctly and users will have a seamless experience when logging back in!

---

**Note**: The system saves session state every 30 seconds and when the user leaves the page, so make sure to wait a moment or refresh the page before logging out to ensure the latest state is saved.
