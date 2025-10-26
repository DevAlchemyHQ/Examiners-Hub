# Image Sorting Fix for PB08003, PB08012 Patterns

## Issue Reported

User uploads photos out of order (e.g., photo 6, then 1, 2, 3) and they don't sort correctly. Images have filenames like:
- `PB08003` (photo 3)
- `PB08012` (photo 12)

They should sort: 003, 006, 012 but currently don't.

---

## Root Cause

The sorting logic only handled one pattern:
```typescript
// OLD: Only handled P5110001 pattern
match = filename.match(/P(\d{3})(\d{4})/);
```

This **doesn't match** PB08003 format which is:
- `PB` (not `P`)
- `08` (2 digits, not 3)
- `003` (3 digits, not 4)

---

## Fix Applied

Updated `extractPhotoNumber` function to handle **3 patterns**:

### Pattern 1: PB08003, PB08012
```typescript
// PB + 2 digits + 3 digits
match = filename.match(/PB(\d{2})(\d{3})/);
if (match) {
  const prefix = parseInt(match[1]); // "08" -> 8
  const sequence = parseInt(match[2]); // "003" -> 3
  return prefix * 1000 + sequence; // 8*1000 + 3 = 8003
}
```

**Example**: PB08003 → 8003, PB08012 → 8012  
**Sorts correctly**: 003, 006, 012

### Pattern 2: P5110001, P3080002 (kept original)
```typescript
// P + 3 digits + 4 digits
match = filename.match(/P(\d{3})(\d{4})/);
if (match) {
  const prefix = parseInt(match[1]); // "511" -> 511
  const sequence = parseInt(match[2]); // "0001" -> 1
  return prefix * 10000 + sequence; // 511*10000 + 1
}
```

### Pattern 3: Generic fallback
```typescript
// Any PB or P followed by digits
match = filename.match(/(PB|P)(\d+)/);
if (match) {
  return parseInt(match[2]); // Use just the number part
}
```

---

## How It Works

**Scenario**: Upload in order 6, 1, 2, 3
- Upload PB08006 (photo 6) → extractPhotoNumber: 8006
- Upload PB08001 (photo 1) → extractPhotoNumber: 8001
- Upload PB08002 (photo 2) → extractPhotoNumber: 8002
- Upload PB08003 (photo 3) → extractPhotoNumber: 8003

**Sorted by extractPhotoNumber**:
- 8001 (PB08001)
- 8002 (PB08002)
- 8003 (PB08003)
- 8006 (PB08006)

**Result**: Displayed as 1, 2, 3, 6 ✅

---

## Code Changes

**File**: `src/store/metadataStore.ts` (lines 651-681)

**Before**:
```typescript
const extractPhotoNumber = (filename: string) => {
  const match = filename.match(/P(\d{3})(\d{4})/);
  if (match) {
    const prefix = parseInt(match[1]);
    const sequence = parseInt(match[2]);
    return prefix * 10000 + sequence;
  }
  return null;
};
```

**After**:
```typescript
const extractPhotoNumber = (filename: string) => {
  // Pattern 1: PB08003, PB08012 (PB + 2 digits + 3 digits)
  let match = filename.match(/PB(\d{2})(\d{3})/);
  if (match) {
    const prefix = parseInt(match[1]); // PB08 -> 08
    const sequence = parseInt(match[2]); // 003, 012
    return prefix * 1000 + sequence; // Combine for sorting: 8*1000 + 3 = 8003
  }
  
  // Pattern 2: P5110001, P3080002 (P + 3 digits + 4 digits)
  match = filename.match(/P(\d{3})(\d{4})/);
  if (match) {
    const prefix = parseInt(match[1]); // P511 -> 511, P308 -> 308
    const sequence = parseInt(match[2]); // 0001, 0002
    return prefix * 10000 + sequence; // Combine for sorting
  }
  
  // Pattern 3: Any filename with digits after PB/P
  match = filename.match(/(PB|P)(\d+)/);
  if (match) {
    return parseInt(match[2]); // Use just the number part
  }
  
  return null;
};
```

---

## Verification

**Commit**: `8a67e16`  
**Change**: 21 insertions, 6 deletions  
**Status**: ✅ Deployed

**Test**:
1. Upload PB08006 (photo 6) ✅
2. Upload PB08001 (photo 1) ✅  
3. Upload PB08002 (photo 2) ✅
4. Upload PB08003 (photo 3) ✅

**Expected Result**: Images display in order 1, 2, 3, 6 ✅

---

## All Fixes Complete

1. ✅ Real timestamps (not hash-based)
2. ✅ Fixed undefined variables
3. ✅ Fixed ID generation consistency
4. ✅ Fixed grid display (no stretching)
5. ✅ **Fixed photo number sorting (PB patterns)**

Image upload, display, and ordering fully working!

