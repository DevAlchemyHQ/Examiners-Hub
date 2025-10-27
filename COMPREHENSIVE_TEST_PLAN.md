# Comprehensive Test Plan for Selected Images

## Overview
This test plan verifies all selected images functionality, including position-based insertion, multiple instance selection, persistence, stability, and correct sort behavior.

## Current State (Commit c96a34a)
- **toggleImageSelection**: Always adds images (no toggle logic)
- **sortImages**: Stable sort that doesn't reorder items without photo numbers
- **Position Logic**: Based on `defectSortDirection` in `toggleImageSelection`

## Test Scenarios

### Test 1: Basic Selection - Descending Mode
**Setup**: 
1. Navigate to app
2. Click "Sort" button (should activate descending sort)
3. Note current selected images count

**Steps**:
1. Select PB080002 copy.JPG (has photo number "3")
2. Wait 5 seconds
3. Observe position in selected images panel

**Expected Result**:
- Image appears at START of selected images list
- Has photo number "3" 
- Console log shows: "Added to start"
- Selected count increases by 1

---

### Test 2: Basic Selection - Ascending Mode
**Setup**:
1. Click "Sort" button (should cycle to ascending mode)
2. Wait 2 seconds for sort to apply

**Steps**:
1. Select PB080001 copy.JPG (has photo number "4")
2. Wait 5 seconds
3. Observe position in selected images panel

**Expected Result**:
- Image appears at END of selected images list
- Has photo number "4"
- Console log shows: "Added to end" with "ascending"
- Selected count increases by 1

---

### Test 3: Basic Selection - No Sort Mode
**Setup**:
1. Click "Sort" button (should cycle to no sort/null)
2. Wait 2 seconds

**Steps**:
1. Select PB080003 copy.JPG (no photo number)
2. Wait 5 seconds
3. Observe position in selected images panel

**Expected Result**:
- Image appears at END of selected images list
- No photo number shown initially
- Console log shows: "Added to end" with "no sort"
- Selected count increases by 1

---

### Test 4: Multiple Instances of Same Image
**Setup**: Have at least 2 different images selected

**Steps**:
1. Click Sort button to set to descending mode
2. Select PB080002 copy.JPG (should already be selected)
3. Wait 3 seconds
4. Observe selected images panel

**Expected Result**:
- PB080002 appears TWICE in selected images
- Both instances have unique instanceIds
- Second instance appears at START (descending mode)
- Console shows "Added to start" with unique instanceId
- Selected count increases

---

### Test 5: Position Verification - Descending
**Setup**: Clear all selected images

**Steps**:
1. Click Sort button to descending mode
2. Select PB080001 (has "4")
3. Wait 3 seconds
4. Select PB080002 (has "3") 
5. Wait 3 seconds
6. Observe final order

**Expected Result**:
- Final order: PB080002 (3) at top, PB080001 (4) below
- Both have correct photo numbers
- New images always added at START in descending mode
- Console logs show "Added to start" for both

---

### Test 6: Position Verification - Ascending
**Setup**: Clear all selected images

**Steps**:
1. Click Sort button to ascending mode
2. Select PB080001 (has "4")
3. Wait 3 seconds  
4. Select PB080002 (has "3")
5. Wait 3 seconds
6. Observe final order

**Expected Result**:
- Final order: PB080002 (3) at top, PB080001 (4) below
- (Images sorted by number, new ones added at end)
- Console logs show "Added to end" for both

---

### Test 7: Editing Metadata - Stability
**Setup**: Have at least 2 selected images

**Steps**:
1. Add photo number "1" to first selected image
2. Type description "test description"
3. Edit photo number to "2" on second image
4. Observe if images move around

**Expected Result**:
- Images do NOT "jump" or "bob"
- Images maintain their positions
- Descriptions persist during edits
- Photo numbers update in place
- No layout shifts

---

### Test 8: Toggling Sort - No Description Loss
**Setup**: Have 1-2 selected images with descriptions and photo numbers

**Steps**:
1. Add descriptions to selected images
2. Add photo numbers to selected images
3. Wait 2 seconds
4. Click Sort button to cycle to next mode
5. Wait 2 seconds for sort to apply
6. Observe descriptions and photo numbers

**Expected Result**:
- Descriptions remain filled
- Photo numbers remain filled
- Images may reorder, but metadata persists
- No fields cleared
- Console shows no errors

---

### Test 9: Deletion Persistence
**Setup**: Have multiple selected images

**Steps**:
1. Click delete button on one selected image
2. Wait 5 seconds (for polling)
3. Refresh page
4. Observe selected images

**Expected Result**:
- Deleted image does NOT reappear after polling
- Deleted image does NOT reappear after refresh
- Remaining images persist with metadata
- Selected count decreases correctly

---

### Test 10: Cross-Browser Sync
**Setup**: Open two browsers with same account

**Steps**:
1. In Browser 1: Select 2 images
2. Add descriptions and photo numbers
3. Wait 10 seconds for sync
4. Refresh Browser 2
5. Observe selected images

**Expected Result**:
- Both images appear in Browser 2
- Descriptions appear correctly
- Photo numbers appear correctly
- Images in same order as Browser 1
- Selected count matches Browser 1

---

### Test 11: Refresh Persistence
**Setup**: Select multiple images with metadata

**Steps**:
1. Select 3 images
2. Add photo numbers to all
3. Add descriptions to all
4. Wait 5 seconds for auto-save
5. Refresh page
6. Observe selected images

**Expected Result**:
- All 3 images remain selected
- All photo numbers persist
- All descriptions persist
- Images in correct order based on sort mode
- No "flash" of empty state

---

### Test 12: Adding Images Without Photo Numbers
**Setup**: Clear all selected images, set to ascending mode

**Steps**:
1. Select PB080003 (no photo number)
2. Wait 3 seconds
3. Add photo number "5" to it
4. Select PB080001 (no photo number yet)
5. Wait 3 seconds
6. Observe positions

**Expected Result**:
- PB080003 appears first, then gets "5"
- PB080001 appears at END (ascending mode)
- Adding photo numbers doesn't cause jumping
- Images maintain position where they were inserted

---

### Test 13: Adding Images With Photo Numbers
**Setup**: Have PB080001 selected with photo number "4"

**Steps**:
1. Set to descending mode
2. Select PB080003 (no number)
3. Add photo number "1" to PB080003
4. Observe final order

**Expected Result**:
- Order: PB080001 (4) at top, PB080003 (1) at bottom
- Descending mode shows highest first, lowest last
- Photo number "1" correctly placed at end
- No visual jumping when adding numbers

---

## Console Logs to Monitor

For each selection, look for:
```
🔧 toggleImageSelection (ascending|descending|no sort) - Added to end|start
🔧 toggleImageSelection - Total selected: [count]
📱 Selected images saved to localStorage
💾 Auto-saving selected images to AWS
```

For errors, check for:
```
❌ Error saving selected images
❌ ReferenceError
❌ TypeError
⚠️ Skipping AWS sync
```

## Success Criteria

✅ **Selection**: Same image can be selected multiple times  
✅ **Position**: Descending adds at start, Ascending/No-sort adds at end  
✅ **Stability**: No jumping/bobbing when editing metadata  
✅ **Persistence**: All metadata persists on refresh and cross-browser  
✅ **Deletion**: Deleted images don't reappear  
✅ **Sort Toggle**: Doesn't clear descriptions  
✅ **No Errors**: No console errors during any operation  

