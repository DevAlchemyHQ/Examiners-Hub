# 🔧 S3 Key Handling & Transformation Documentation

## Overview

This document describes the S3 key handling strategy implemented to fix the issue where ZIP downloads contained only text files instead of images.

## Problem Statement

**Issue**: Lambda function was receiving incorrect S3 keys, causing it to fail to retrieve images from S3, resulting in ZIP files containing only metadata text files.

**Root Cause**:

1. S3 keys stored in application didn't match actual S3 filenames
2. Transformation functions prioritized stored `s3Key` over `publicUrl`
3. URL encoding issues with spaces in filenames

## Solution Architecture

### Two-Tier S3 Key Management

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Store S3 keys as filenames only                       │
│    s3Key: "1753041306448-PB080003 copy.JPG"              │
│    publicUrl: "https://bucket.s3.region.amazonaws.com/..."│
├─────────────────────────────────────────────────────────────┤
│ 2. Transform during download processing                   │
│    Extract full S3 path from publicUrl                    │
│    s3Key: "users/email/images/1753041306448-PB080003 copy.JPG" │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Application Storage (`metadataStore.ts`)

**Before Fix:**

```typescript
s3Key: `users/${userId}/images/${file.name}`; // Full path stored
```

**After Fix:**

```typescript
s3Key: file.name; // Just filename stored
```

**Location**: `src/store/metadataStore.ts` lines 664 and 207

### 2. Transformation Functions (`downloadTransformers.ts/js`)

**Priority Logic:**

```typescript
// ALWAYS prefer publicUrl over s3Key for accuracy
if (image.publicUrl && image.publicUrl.trim() !== "") {
  const url = new URL(image.publicUrl);
  s3Key = decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
  console.log("Extracted S3 key from publicUrl:", s3Key);
} else if (image.s3Key && image.s3Key.trim() !== "") {
  s3Key = `users/${image.userId || "anonymous"}/images/${image.s3Key}`;
  console.log("Using stored s3Key:", s3Key);
}
```

**Key Features:**

- ✅ **PublicUrl Priority**: Always extract from publicUrl first
- ✅ **URL Decoding**: Handle spaces in filenames with `decodeURIComponent()`
- ✅ **Fallback Chain**: Multiple fallback strategies
- ✅ **Consistent Logic**: Both TypeScript and JavaScript versions

### 3. File Locations

**TypeScript Version:**

- `src/utils/downloadTransformers.ts`
- `src/store/metadataStore.ts`

**JavaScript Version:**

- `src/utils/downloadTransformers.js`

## Data Flow

### 1. Image Upload

```
File Upload → S3 Upload → Store filename as s3Key → Store full URL as publicUrl
```

### 2. Download Processing

```
User Request → Transform Functions → Extract S3 key from publicUrl → Send to Lambda → Lambda retrieves images → ZIP creation
```

### 3. Transformation Chain

```
ImageMetadata → transformSelectedImagesForLambda() → UnifiedImageData → Lambda
BulkDefect[] → transformBulkDefectsForLambda() → UnifiedImageData[] → Lambda
```

## Testing & Verification

### Test Files Created

- `test-fixed-app.js` - Tests both modes with fixed transformation
- `test-debug-publicurl-extraction.js` - Debug publicUrl extraction
- `test-debug-logic.js` - Debug transformation logic

### Verification Steps

1. ✅ Transformation functions show "Extracted S3 key from publicUrl"
2. ✅ Lambda receives correct S3 keys
3. ✅ ZIP files contain images and metadata
4. ✅ Both bulk defects and selected images modes work

## Error Handling

### URL Decoding

```typescript
// Handle spaces in filenames
s3Key = decodeURIComponent(url.pathname.substring(1));
// "PB080003%20copy.JPG" → "PB080003 copy.JPG"
```

### Fallback Chain

1. **Primary**: Extract from publicUrl (most reliable)
2. **Secondary**: Use stored s3Key with path construction
3. **Tertiary**: Construct from image ID and filename

### Validation

```typescript
// Ensure publicUrl exists and is not empty
if (image.publicUrl && image.publicUrl.trim() !== "") {
  // Use publicUrl extraction
}
```

## Performance Considerations

### Memory Usage

- S3 keys stored as filenames only (smaller storage)
- Full paths constructed only during download processing
- No duplicate storage of full S3 paths

### Processing Time

- PublicUrl extraction is O(1) operation
- URL decoding adds minimal overhead
- Transformation happens only during download requests

## Maintenance Notes

### Future Changes

- If S3 key structure changes, update transformation functions
- If publicUrl format changes, update extraction logic
- Both TypeScript and JavaScript versions must be kept in sync

### Debugging

- Check console logs for "Extracted S3 key from publicUrl" vs "Using stored s3Key"
- Verify publicUrl format matches expected structure
- Ensure URL decoding handles special characters correctly

## Related Files

### Core Implementation

- `src/store/metadataStore.ts` - S3 key storage
- `src/utils/downloadTransformers.ts` - TypeScript transformation
- `src/utils/downloadTransformers.js` - JavaScript transformation

### Documentation

- `README.md` - User-facing documentation
- `SCHEMA.md` - Data structure documentation
- `S3_KEY_HANDLING.md` - This technical documentation

### Testing

- `test-fixed-app.js` - Integration tests
- `test-debug-*.js` - Debug and verification tests

## Success Metrics

- ✅ ZIP files contain images instead of just text files
- ✅ Both bulk defects and selected images modes work
- ✅ Transformation functions use publicUrl extraction
- ✅ URL decoding handles spaces in filenames
- ✅ Consistent behavior across TypeScript and JavaScript versions
