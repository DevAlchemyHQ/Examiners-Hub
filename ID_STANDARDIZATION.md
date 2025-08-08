# 🆔 **IMAGE ID STANDARDIZATION SYSTEM**

## **📋 Overview**

This document outlines the standardized ID generation system for images throughout the application, from upload to S3 bucket to Lambda processing.

## **🎯 Standardized ID Format**

### **Format: `img-{filename}-{timestamp}`**

**Examples:**

- `img-PB080001-copy-JPG-1754603458580`
- `img-P3080100-JPG-1754603458590`
- `img-sketch-001-1754603458600`

### **Components:**

- **Prefix:** `img-` (always)
- **Filename:** Cleaned filename with special characters replaced by hyphens
- **Timestamp:** Unix timestamp for uniqueness
- **Separator:** `-` (hyphen)

## **🔄 Complete ID Flow**

### **1. Upload Process (Frontend → S3)**

```typescript
// During upload (addImages function)
const timestamp = Date.now() + index;
const filePath = `users/${userId}/images/${timestamp}-${file.name}`;
const consistentId = getConsistentImageId(file.name, undefined, timestamp);

// Example:
// File: PB080001 copy.JPG
// S3 Key: users/timsdng@gmail.com/images/1754603458580-PB080001-copy.JPG
// Frontend ID: img-PB080001-copy-JPG-1754603458580
```

### **2. S3 Loading Process (S3 → Frontend)**

```typescript
// When loading from S3 (loadUserData function)
const originalFileName = file.name.split("-").slice(1).join("-");
const timestamp = parseInt(file.name.split("-")[0]);
const consistentId = getConsistentImageId(
  originalFileName,
  file.name,
  timestamp
);

// Example:
// S3 Key: users/timsdng@gmail.com/images/1754603458580-PB080001-copy.JPG
// Frontend ID: img-PB080001-copy-JPG-1754603458580
```

### **3. Lambda Processing**

```typescript
// Lambda expects s3Key format
const s3Key = `users/${userId}/images/${timestamp}-${filename}`;

// Example:
// s3Key: users/timsdng@gmail.com/images/1754603458580-PB080001-copy.JPG
```

## **🔧 ID Generation Functions**

### **`generateImageId(fileName, source, timestamp)`**

```typescript
const generateImageId = (
  fileName: string,
  source: "local" | "s3" = "local",
  timestamp?: number
): string => {
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, "-");
  const uniqueSuffix = timestamp ? `-${timestamp}` : "";

  if (source === "s3") {
    const keyParts = fileName.split("-");
    const originalFileName = keyParts.slice(1).join("-");
    return `img-${originalFileName.replace(
      /[^a-zA-Z0-9]/g,
      "-"
    )}${uniqueSuffix}`;
  }

  return `img-${cleanFileName}${uniqueSuffix}`;
};
```

### **`getConsistentImageId(fileName, s3Key, timestamp)`**

```typescript
const getConsistentImageId = (
  fileName: string,
  s3Key?: string,
  timestamp?: number
): string => {
  if (s3Key) {
    const originalFileName = extractOriginalFileName(s3Key);
    return generateImageId(originalFileName, "s3", timestamp);
  }
  return generateImageId(fileName, "local", timestamp);
};
```

## **🔄 Migration System**

### **Purpose:**

Handles conversion from old ID formats to new standardized format.

### **Supported Old Formats:**

- `local-{timestamp}-{filename}` (old upload format)
- `s3-{filename}` (old S3 load format)
- `img-{filename}-{timestamp}` (new standardized format)

### **Migration Function:**

```typescript
const migrateSelectedImageIds = (
  selectedImages: Array<{ id: string; instanceId: string }>,
  loadedImages: ImageMetadata[]
): Array<{ id: string; instanceId: string }> => {
  // Converts old IDs to new standardized format
  // Uses filename matching for reliable migration
};
```

## **📊 ID Comparison Table**

| Process | Old Format                              | New Format                            | S3 Key                                               |
| ------- | --------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Upload  | `local-1754603458580-PB080001-copy-JPG` | `img-PB080001-copy-JPG-1754603458580` | `users/email/images/1754603458580-PB080001-copy.JPG` |
| Load    | `s3-PB080001-copy-JPG`                  | `img-PB080001-copy-JPG-1754603458580` | `users/email/images/1754603458580-PB080001-copy.JPG` |
| Lambda  | Various                                 | `img-PB080001-copy-JPG-1754603458580` | `users/email/images/1754603458580-PB080001-copy.JPG` |

## **✅ Benefits of Standardization**

1. **🔄 Consistent IDs:** Same ID format across upload and load
2. **🔗 Reliable Selection:** Selected images persist across sessions
3. **🛠️ Easy Migration:** Automatic conversion from old formats
4. **📦 Lambda Compatibility:** Consistent S3 key construction
5. **🎯 Unique Identification:** Timestamp ensures uniqueness
6. **🧹 Clean Format:** Readable and predictable structure

## **🚨 Migration Notes**

### **Automatic Migration:**

- Old selected images are automatically migrated on load
- No user action required
- Backward compatible with old ID formats

### **Manual Migration (if needed):**

```typescript
// Clear localStorage to force fresh start
localStorage.clear();

// Or clear specific keys
localStorage.removeItem("clean-app-selections-timsdng@gmail.com");
```

## **🔍 Debugging ID Issues**

### **Check Current IDs:**

```javascript
// In browser console
console.log(
  "Images:",
  useMetadataStore
    .getState()
    .images.map((img) => ({ id: img.id, fileName: img.fileName }))
);
console.log("Selected:", useMetadataStore.getState().selectedImages);
```

### **Verify S3 Keys:**

```javascript
// Check S3 key construction
const image = useMetadataStore.getState().images[0];
console.log("S3 Key:", image.s3Key);
console.log("Public URL:", image.publicUrl);
```

## **📝 Implementation Checklist**

- [x] Standardized ID generation functions
- [x] Updated upload process
- [x] Updated S3 loading process
- [x] Migration function for old IDs
- [x] Lambda compatibility
- [x] Backward compatibility
- [x] Documentation

## **🎯 Future Improvements**

1. **🔍 ID Validation:** Add validation for ID format consistency
2. **📊 ID Analytics:** Track ID generation patterns
3. **🔄 Auto-Migration:** Automatic migration on app startup
4. **🧪 Testing:** Unit tests for ID generation functions
