# TODO: UI/UX Fixes

## 🎯 **Priority Fixes for Exametry App**

### **1. Date Field Fix** 🔧

**Issue**: Date picker in project details is allowing year editing when it shouldn't
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/MetadataForm.tsx` (likely)
- Date picker component

**Tasks**:

- [ ] Identify the date picker component being used
- [ ] Add year restriction to prevent year editing
- [ ] Test date selection functionality
- [ ] Ensure only month/day selection is allowed

---

### **2. Tab Switching Animation Fix** 🎬

**Issue**: Flickering and jumping when switching from "Images" to "Bulk" tabs
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/BulkTextInput.tsx`
- Tab switching logic

**Tasks**:

- [ ] Identify the tab switching component
- [ ] Add smooth transitions between tabs
- [ ] Fix layout jumping by maintaining consistent container heights
- [ ] Add CSS transitions for smooth animations
- [ ] Test tab switching on different screen sizes

---

### **3. Profile Popup Cleanup** 👤

**Issue**: Profile popup needs cleanup, hide subscription tab, allow photo and name editing
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/profile/UserProfile.tsx`
- `src/components/profile/EditProfile.tsx`

**Tasks**:

- [ ] Hide subscription tab temporarily
- [ ] Add photo upload functionality
- [ ] Add name editing capability
- [ ] Clean up profile popup layout
- [ ] Test profile editing features
- [ ] Ensure photo upload works with S3

---

### **4. Duplicate Error Messages Fix** ⚠️

**Issue**: Error messages are appearing as duplicates
**Status**: ⏳ Pending
**Files to Modify**:

- Error handling components
- Form validation logic

**Tasks**:

- [ ] Identify where duplicate error messages are being generated
- [ ] Consolidate error message logic
- [ ] Ensure only one error message per validation
- [ ] Test error message display
- [ ] Clean up error state management

---

### **5. Tile Grid Layout Fix** 📱

**Issue**: Tiles leave space at bottom when scrolling up
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/ImageGrid.tsx`
- CSS grid layout

**Tasks**:

- [ ] Fix grid layout to fill available space
- [ ] Ensure tiles expand to fill bottom space
- [ ] Test scrolling behavior
- [ ] Verify layout on different screen sizes
- [ ] Optimize grid responsiveness

---

### **6. Image Selection Order Fix** 🔄

**Issue**: New selected images should appear at top-left when on "high to low" mode
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/ImageGrid.tsx`
- Image sorting logic

**Tasks**:

- [ ] Fix image selection order for "high to low" mode
- [ ] Ensure new selections appear at top-left
- [ ] Test "low to high" mode (currently working)
- [ ] Verify sorting logic consistency
- [ ] Test with different image sets

---

### **7. Save Defect Set Functionality** 💾

**Issue**: Save defect set should work as intended
**Status**: ⏳ Pending
**Files to Modify**:

- `src/components/BulkTextInput.tsx`
- `src/lib/services.ts` (DatabaseService)

**Tasks**:

- [ ] Debug save defect set functionality
- [ ] Ensure proper data persistence
- [ ] Test save/load operations
- [ ] Verify defect set storage in DynamoDB
- [ ] Add error handling for save operations
- [ ] Test with different defect sets

---

## 🚀 **Implementation Order**

### **Phase 1: Critical UI Fixes**

1. **Date Field Fix** - High priority for user experience
2. **Duplicate Error Messages** - Clean up user interface
3. **Tab Switching Animation** - Improve smoothness

### **Phase 2: Layout & Functionality**

4. **Tile Grid Layout** - Fix visual layout issues
5. **Image Selection Order** - Fix sorting behavior
6. **Save Defect Set** - Core functionality fix

### **Phase 3: Profile Enhancement**

7. **Profile Popup Cleanup** - User account management

---

## 🔍 **Files to Investigate**

### **Date Picker**:

- Search for date input components
- Check for date picker libraries being used
- Look for year restriction settings

### **Tab Switching**:

- `src/components/BulkTextInput.tsx`
- Tab state management
- CSS transitions

### **Profile Components**:

- `src/components/profile/UserProfile.tsx`
- `src/components/profile/EditProfile.tsx`
- Profile state management

### **Error Handling**:

- Form validation components
- Error state management
- Error message display logic

### **Image Grid**:

- `src/components/ImageGrid.tsx`
- Grid layout CSS
- Image sorting logic

### **Defect Set Storage**:

- `src/lib/services.ts` (DatabaseService)
- Defect set save/load functions
- DynamoDB operations

---

## 📋 **Testing Checklist**

### **Before Starting**:

- [ ] Create backup of current working state
- [ ] Test current functionality to establish baseline
- [ ] Document current behavior for each issue

### **After Each Fix**:

- [ ] Test the specific fix
- [ ] Ensure no regression in other features
- [ ] Test on different screen sizes
- [ ] Verify functionality in different browsers

### **Final Testing**:

- [ ] End-to-end testing of all fixes
- [ ] Performance testing
- [ ] User experience validation
- [ ] Cross-browser compatibility

---

## 🎯 **Success Criteria**

### **Date Field**:

- ✅ Year editing is disabled
- ✅ Only month/day selection allowed
- ✅ Date picker works smoothly

### **Tab Switching**:

- ✅ No flickering or jumping
- ✅ Smooth transitions
- ✅ Consistent layout

### **Profile Popup**:

- ✅ Subscription tab hidden
- ✅ Photo upload working
- ✅ Name editing functional
- ✅ Clean, professional layout

### **Error Messages**:

- ✅ No duplicate messages
- ✅ Clear, single error per issue
- ✅ Proper error state management

### **Tile Grid**:

- ✅ Tiles fill bottom space
- ✅ Smooth scrolling
- ✅ Responsive layout

### **Image Selection**:

- ✅ New selections appear at top-left (high to low)
- ✅ Low to high mode continues working
- ✅ Consistent sorting behavior

### **Save Defect Set**:

- ✅ Saves successfully to database
- ✅ Loads correctly
- ✅ Error handling for failures
- ✅ Data persistence verified

---

## 📝 **Notes**

- **Priority**: Focus on user-facing issues first (1-4)
- **Testing**: Test each fix individually before moving to next
- **Documentation**: Update any relevant documentation after fixes
- **Deployment**: Deploy fixes incrementally to catch issues early

**Estimated Time**: 2-3 days for all fixes
**Complexity**: Medium - mostly UI/UX improvements with some backend fixes
