# Legacy Full-State Writes Analysis

## Summary

This document identifies all locations where we're doing expensive "delete-all then write-all" or full-state writes to DynamoDB that could cause throttling or high costs.

---

## 🔴 CRITICAL: Bulk Defects - Delete-All Pattern

**File**: `src/lib/services.ts` - `updateBulkDefects()`

**Current Pattern**:

```typescript
1. Scan all bulk defects for user
2. Delete ALL existing defects (BatchWrite with DeleteRequest)
3. Write ALL new defects (BatchWrite with PutRequest)
```

**Problem**: Every change = Delete N items + Write N items (2N operations)

**Where Called**:

- `src/store/metadataStore.ts:2026` - Manual save
- `src/store/metadataStore.ts:2593` - saveBulkData()
- `src/store/metadataStore.ts:3290` - smartAutoSave('all')
- `src/store/metadataStore.ts:3413` - smartAutoSave('bulk')

**Recommendation**: Similar to selectedImages - compute diff, only delete removed, only write new/changed

---

## 🟡 MODERATE: Instance Metadata - Full Object Write

**File**: `src/lib/services.ts` - `saveInstanceMetadata()`

**Current Pattern**:

```typescript
UpdateExpression: "SET instanceMetadata = :instanceMetadata";
// Writes entire instanceMetadata object every time
```

**Problem**: Every metadata change (photoNumber, description) = full object rewrite

**Where Called**:

- `src/store/metadataStore.ts:1260` - Batched description deletions (legacy)
- `src/store/metadataStore.ts:1320` - Debounced saves (legacy, 3s debounce)
- `src/store/metadataStore.ts:2529` - saveUserData()
- `src/store/metadataStore.ts:3294` - smartAutoSave('all')
- `src/store/metadataStore.ts:3423` - smartAutoSave('selections')

**Recommendation**: If operations system handles this, legacy writes can be removed. Operations already handle UPDATE_METADATA.

---

## 🟡 MODERATE: Form Data / Session State - Full Object Write

**File**: `src/lib/services.ts` - `updateProject()`

**Current Pattern**:

```typescript
UpdateExpression: "SET formData = :formData, sessionState = :sessionState";
// Writes entire formData and sessionState objects
```

**Problem**: Every form field change = full object rewrite (but operations cover this)

**Where Called** (many places - see below):

- Operations system already handles formData via UPDATE_FORMDATA operations
- Legacy saves still happen for "backward compatibility"

**Recommendation**: Remove legacy formData saves since operations handle it. Keep sessionState saves (not covered by operations yet).

---

## 🟢 LOW: Selected Images - Already Optimized

**File**: `src/lib/services.ts` - `updateSelectedImages()`

**Status**: ✅ Just fixed - now uses diff pattern (only delete removed, only write new/changed)

**Remaining Calls** (should be safe, but could remove if operations fully handle):

- `src/store/metadataStore.ts:1682` - Batched deletions (still called)
- `src/store/metadataStore.ts:1721` - Debounced additions (still called but now optimized)
- `src/store/metadataStore.ts:2538` - saveUserData() (manual save)
- `src/store/metadataStore.ts:3292` - smartAutoSave('all')
- `src/store/metadataStore.ts:3422` - smartAutoSave('selections')

---

## 📊 Detailed Breakdown by Function

### 1. `setFormData()` - Dual Write Pattern

**File**: `src/store/metadataStore.ts:596`

**Current**:

- ✅ Operations: Saves UPDATE_FORMDATA operation
- ❌ Legacy: Also calls `forceAWSSave()` → `updateProject()` with full formData

**Impact**: Every keystroke = 1 operation write + 1 legacy full-state write

**Fix**: Remove legacy write at line 748-750

---

### 2. `updateInstanceMetadata()` - Dual Write Pattern

**File**: `src/store/metadataStore.ts:1181`

**Current**:

- ✅ Operations: Saves UPDATE_METADATA operation
- ❌ Legacy: Also calls `saveInstanceMetadata()` with full metadata object

**Impact**: Every metadata change = 1 operation write + 1 legacy full-object write

**Fix**: Remove legacy writes at lines 1254-1261 and 1314-1321

---

### 3. `setBulkDefects()` - Full State Write

**File**: `src/store/metadataStore.ts:2000`

**Current**:

- ❌ No operations system for bulk defects yet
- ❌ Calls `updateBulkDefects()` which does delete-all + write-all

**Impact**: Every bulk defect change = delete all + write all

**Fix**: Add operations system OR implement diff pattern in `updateBulkDefects()`

---

### 4. `smartAutoSave()` - Multiple Legacy Writes

**File**: `src/store/metadataStore.ts:3281`

**Current**:

```typescript
Promise.allSettled([
  updateProject(...),      // Full formData + sessionState
  updateBulkDefects(...),  // Delete-all + Write-all
  updateSelectedImages(...), // Now optimized (diff pattern)
  saveInstanceMetadata(...)  // Full metadata object
])
```

**Impact**: Every auto-save = 4 full-state writes (parallel, but still expensive)

**Fix**: Remove legacy writes, rely on operations system

---

## 🎯 Priority Recommendations

### High Priority (Throttling Risk)

1. **Bulk Defects** - Implement diff pattern (like selectedImages fix)
2. **Remove legacy selectedImages writes** - Operations already handle it

### Medium Priority (Cost Optimization)

3. **Remove legacy formData writes** - Operations handle UPDATE_FORMDATA
4. **Remove legacy instanceMetadata writes** - Operations handle UPDATE_METADATA

### Low Priority (Nice to Have)

5. **Session State** - Consider operations system or incremental updates
6. **Image Metadata** - Check if operations system should handle this

---

## 💰 Cost Impact Estimation

**Before optimization**:

- Rapid selection changes: ~28 DB operations (delete 14 + write 14) × multiple calls = **throttling**
- Form field typing: ~2 DB writes per keystroke (operation + legacy)
- Metadata updates: ~2 DB writes per change (operation + legacy)

**After full optimization**:

- Selection changes: ~1-2 DB operations (only diff)
- Form field typing: ~1 DB write (operation only)
- Metadata updates: ~1 DB write (operation only)

**Estimated savings**: 50-70% reduction in DynamoDB write operations
