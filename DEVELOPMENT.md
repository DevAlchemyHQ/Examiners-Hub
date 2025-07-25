# 🛠️ Development Guide

## **📋 Quick Reference Schema**

### **Key Data Structures**

**Selected Images Mode:**

```typescript
selectedImages: Set<string>; // Image IDs
images: ImageMetadata[];
formData: { elr: string; structureNo: string; date: string; };
viewMode: 'images';
```

**Bulk Defects Mode:**

```typescript
bulkDefects: BulkDefect[];
bulkSelectedImages: Set<string>; // Image IDs
formData: { elr: string; structureNo: string; date: string; };
viewMode: 'bulk';
```

### **API Payload Structure**

```typescript
// Both modes use same endpoint
POST / api / download;
{
  mode: "images" | "bulk";
  selectedImages: Array<{
    photoNumber: string;
    description: string;
    s3Key: string; // Full S3 path extracted from publicUrl
    selectedFile?: string; // Only for bulk mode
  }>;
  formData: {
    elr: string;
    structureNo: string;
    date: string;
  }
}
```

### **Lambda Processing**

1. Download images from S3 using s3Key
2. Create ZIP with custom naming: `Photo {number} ^ {description} ^ {date}.jpg`
3. Add metadata.txt with project details
4. Upload ZIP to S3 downloads/ folder
5. Generate presigned URL (1 hour expiry)
6. 🗑️ Delete ZIP file after successful upload
7. Return download URL

## **🔧 S3 Key Handling & Transformation**

### **Critical Implementation Details**

**Storage Strategy:**

```typescript
// Application stores S3 keys as filenames only
interface ImageMetadata {
  s3Key: string; // "1753041306448-PB080003 copy.JPG"
  publicUrl: string; // Full S3 URL for extraction
}
```

**Transformation Logic:**

```typescript
// Priority-based extraction in downloadTransformers.ts/js
if (image.publicUrl && image.publicUrl.trim() !== "") {
  const url = new URL(image.publicUrl);
  s3Key = decodeURIComponent(url.pathname.substring(1)); // Extract full path
} else if (image.s3Key && image.s3Key.trim() !== "") {
  s3Key = `users/${image.userId}/images/${image.s3Key}`; // Construct path
}
```

**Key Files:**

- `src/store/metadataStore.ts` - S3 key storage (lines 664, 207)
- `src/utils/downloadTransformers.ts` - TypeScript transformation
- `src/utils/downloadTransformers.js` - JavaScript transformation

### **Transformation Functions**

**Selected Images Mode:**

```typescript
transformSelectedImagesForLambda(selectedImages: ImageMetadata[], formData: FormData)
→ { selectedImages: UnifiedImageData[], formData: FormData, mode: 'images' }
```

**Bulk Defects Mode:**

```typescript
transformBulkDefectsForLambda(bulkDefects: BulkDefect[], images: ImageMetadata[], formData: FormData)
→ { selectedImages: UnifiedImageData[], formData: FormData, mode: 'bulk' }
```

**Validation:**

```typescript
validateTransformedData(originalData, transformedData, mode: 'images' | 'bulk')
→ boolean
```

### **Debugging S3 Key Issues**

**Check Console Logs:**

- ✅ "Extracted S3 key from publicUrl" = Working correctly
- ❌ "Using stored s3Key" = May indicate issues

**Test Files:**

- `test-fixed-app.js` - Integration tests
- `test-debug-publicurl-extraction.js` - Debug extraction
- `test-debug-logic.js` - Debug transformation logic

## **🔧 Key Functions to Preserve**

### **Frontend Functions (metadataStore.ts)**

```typescript
// Selected Images Mode
toggleImageSelection(id: string): void;
updateImageMetadata(id: string, data: Partial<ImageMetadata>): Promise<void>;
clearSelectedImages(): void;

// Bulk Defects Mode
setBulkDefects(defects: BulkDefect[]): void;
toggleBulkImageSelection(id: string): void;
clearBulkSelectedImages(): void;

// Shared Functions
setFormData(data: Partial<FormData>): void;
setViewMode(mode: 'images' | 'bulk'): void;
loadUserData(): Promise<void>;
saveUserData(): Promise<void>;
```

### **Backend Functions (download.js)**

```typescript
POST /api/download
- Validates payload structure
- Calls Lambda function
- Returns presigned URL
```

### **Lambda Functions (index.js - CommonJS)**

```typescript
exports.handler = async (event) => {
  // Process both modes with same logic
  // Custom file naming
  // Metadata.txt creation
  // Auto-deletion after upload
};
```

## **⚠️ Critical Data Persistence**

### **Selected Images Mode**

- **localStorage:** `clean-app-selected-images`
- **AWS DynamoDB:** `mvp-labeler-selected-images` table
- **Auto-save:** On every selection change

### **Bulk Defects Mode**

- **localStorage:** `clean-app-bulk-data`
- **AWS DynamoDB:** `mvp-labeler-bulk-defects` table
- **Auto-save:** On every defect change

### **Form Data**

- **localStorage:** `clean-app-form-data`
- **AWS DynamoDB:** `mvp-labeler-form-data` table
- **Auto-save:** On every form change

## **🎯 Validation Rules**

### **Selected Images Mode**

- ✅ At least one image selected
- ✅ Each selected image has photoNumber and description
- ✅ FormData has elr, structureNo, date
- ✅ User has active subscription

### **Bulk Defects Mode**

- ✅ At least one bulk defect exists
- ✅ Each defect has photoNumber, description, selectedFile
- ✅ FormData has elr, structureNo, date
- ✅ User has active subscription

## **🔄 Complete Flow (Don't Break!)**

### **Selected Images Mode**

1. User uploads images to S3
2. User selects images from grid
3. User enters metadata for each selected image
4. User enters bulk metadata (ELR, structure, date)
5. Frontend validates inputs
6. Frontend calls `/api/download` with mode: 'images'
7. Lambda processes images with custom naming
8. Lambda creates ZIP with metadata.txt
9. Lambda uploads ZIP and returns presigned URL
10. Frontend triggers download
11. 🗑️ Lambda deletes ZIP file

### **Bulk Defects Mode**

1. User uploads images to S3
2. User creates bulk defects with metadata
3. User assigns images to defects
4. User enters bulk metadata (ELR, structure, date)
5. Frontend validates inputs
6. Frontend calls `/api/download` with mode: 'bulk'
7. Lambda processes defects with custom naming
8. Lambda creates ZIP with metadata.txt
9. Lambda uploads ZIP and returns presigned URL
10. Frontend triggers download
11. 🗑️ Lambda deletes ZIP file

## **🔧 Development Guidelines**

### **Before Making Changes:**

1. **Check this schema** to understand data structures
2. **Test both modes** to ensure they still work
3. **Preserve auto-save functionality** for both modes
4. **Maintain data structure consistency** between modes
5. **Update schema** if data structures change

### **When Adding Features:**

1. **Test both modes** with new features
2. **Preserve existing functionality** for both modes
3. **Update validation rules** if needed
4. **Test data persistence** across sessions
5. **Verify ZIP structure** remains consistent

### **When Fixing Bugs:**

1. **Identify which mode** the bug affects
2. **Test the other mode** to ensure no regression
3. **Check data persistence** after fixes
4. **Verify validation rules** still work
5. **Test complete flow** from upload to download

### **Key Dependencies:**

- **Frontend:** React + Zustand + TypeScript
- **Backend:** Express + AWS SDK
- **Lambda:** Node.js + JSZip + AWS SDK (CommonJS)
- **Storage:** S3 + DynamoDB + localStorage
- **Deployment:** AWS Lambda + API Gateway

## **📊 ZIP File Structure (Must Maintain)**

### **File Naming Convention**

```
Photo {photoNumber} ^ {description} ^ {formattedDate}.jpg
Example: Photo 1 ^ rewwe ^ 02-07-25.jpg
```

### **Date Formatting**

```typescript
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};
```

### **Metadata.txt Content**

```
ELR: {formData.elr}
Structure: {formData.structureNo}
Date: {formattedDate}

Defect List:
- Photo 1 ^ rewwe ^ 02-07-25.jpg
- Photo 2 ^ crack in wall ^ 02-07-25.jpg
```

## **✅ Recent Fixes Applied**

### **Selected Images Mode (Fixed)**

- ✅ **Module syntax**: Converted Lambda from ES6 to CommonJS
- ✅ **Custom file naming**: Implemented proper naming for images mode
- ✅ **Metadata.txt creation**: Added metadata file generation
- ✅ **Validation**: Enhanced validation for photo numbers and descriptions
- ✅ **Persistence**: Fixed localStorage and AWS dual-save system

### **Lambda Function (Updated)**

- ✅ **CommonJS syntax**: Fixed import/export issues
- ✅ **Dependencies**: Proper @aws-sdk/client-s3 usage
- ✅ **Error handling**: Improved error logging and handling
- ✅ **Auto-deletion**: ZIP files are cleaned up after download

### **Frontend Components (Enhanced)**

- ✅ **SelectedImagesPanel**: Fixed metadata retrieval and UI state
- ✅ **DownloadButton**: Improved validation and S3 key extraction
- ✅ **useValidation**: Enhanced validation logic for selected images
- ✅ **metadataStore**: Fixed persistence and TypeScript errors

## **🚨 Critical Notes**

### **Lambda Deployment**

- **File extension**: Use `index.js` (CommonJS), not `index.mjs` (ES6)
- **Dependencies**: Include `node_modules` in deployment package
- **Syntax**: Use `require()` and `exports.handler`, not `import` and `export`

### **Data Persistence**

- **Dual-save system**: localStorage (instant) + AWS (cross-device)
- **Filename matching**: Ensures persistence across sessions
- **Auto-save**: Triggers on every state change

### **Validation**

- **Photo numbers**: Must be present for all selected images
- **Descriptions**: Must be present for all selected images
- **Form data**: ELR, structure number, and date required
- **Subscription**: User must have active subscription

This development guide ensures **consistent functionality** and **prevents breaking changes** when modifying the application.
