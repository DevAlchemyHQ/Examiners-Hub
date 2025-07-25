# 🏗️ Application Schema Documentation

## **📱 Frontend Data Structures**

### **Selected Images Mode**

```typescript
interface SelectedImage {
  id: string;
  fileName: string;
  photoNumber: string;
  description: string;
  s3Key: string; // Stored as filename only (e.g., "1753041306448-PB080003 copy.JPG")
  publicUrl: string; // Full S3 URL for accurate key extraction
}

interface FormData {
  elr: string;
  structureNo: string;
  date: string;
}

// Frontend State
interface MetadataState {
  selectedImages: Set<string>; // Image IDs
  images: ImageMetadata[];
  formData: FormData;
  viewMode: "images" | "bulk";
}
```

### **Bulk Defects Mode**

```typescript
interface BulkDefect {
  photoNumber: string;
  description: string;
  selectedFile: string; // Filename
  s3Key: string; // Stored as filename only
}

// Frontend State
interface MetadataState {
  bulkDefects: BulkDefect[];
  bulkSelectedImages: Set<string>; // Image IDs
  formData: FormData;
  viewMode: "images" | "bulk";
}
```

## **🔧 S3 Key Handling & Transformation**

### **S3 Key Storage Strategy**

The application uses a two-tier approach for S3 key management:

```typescript
// Application Storage (metadataStore.ts)
interface ImageMetadata {
  id: string;
  fileName: string;
  s3Key: string; // Stored as filename only: "1753041306448-PB080003 copy.JPG"
  publicUrl: string; // Full S3 URL: "https://bucket.s3.region.amazonaws.com/users/email/images/1753041306448-PB080003 copy.JPG"
  userId: string;
  // ... other fields
}

// Transformation Functions (downloadTransformers.ts/js)
interface UnifiedImageData {
  id: string;
  photoNumber: string;
  description: string;
  s3Key: string; // Full S3 path: "users/email/images/1753041306448-PB080003 copy.JPG"
  filename?: string;
  publicUrl?: string;
}
```

### **Transformation Logic**

```typescript
// Priority-based S3 key extraction
function extractS3Key(image: ImageMetadata): string {
  // 1. ALWAYS prefer publicUrl over s3Key for accuracy
  if (image.publicUrl && image.publicUrl.trim() !== "") {
    const url = new URL(image.publicUrl);
    return decodeURIComponent(url.pathname.substring(1)); // Remove leading slash and decode URL
  }

  // 2. Fallback to stored s3Key with full path construction
  if (image.s3Key && image.s3Key.trim() !== "") {
    return `users/${image.userId || "anonymous"}/images/${image.s3Key}`;
  }

  // 3. Final fallback construction
  const userId = image.userId || "anonymous";
  return `users/${userId}/images/${image.fileName}`;
}
```

### **Key Transformation Functions**

Located in `src/utils/downloadTransformers.ts` and `src/utils/downloadTransformers.js`:

- **`transformSelectedImagesForLambda()`**: Converts selected images to unified format
- **`transformBulkDefectsForLambda()`**: Converts bulk defects to unified format
- **`validateTransformedData()`**: Validates transformed data integrity

## **📡 API Communication**

### **Frontend → Backend Payload**

```typescript
// Selected Images Mode
{
  mode: 'images';
  selectedImages: [
    {
      id: string;
      photoNumber: string;
      description: string;
      s3Key: string; // Full S3 path extracted from publicUrl
    }
  ];
  formData: {
    elr: string;
    structureNo: string;
    date: string;
  };
}

// Bulk Defects Mode
{
  mode: 'bulk';
  selectedImages: [
    {
      photoNumber: string;
      description: string;
      selectedFile: string;
      s3Key: string; // Full S3 path extracted from publicUrl
    }
  ];
  formData: {
    elr: string;
    structureNo: string;
    date: string;
  };
}
```

### **Backend → Frontend Response**

```typescript
{
  success: boolean;
  downloadUrl: string;
  filename: string;
  message: string;
}
```

## **⚡ Lambda Function Schema**

### **Input Payload**

```typescript
interface LambdaEvent {
  selectedImages: Array<{
    photoNumber: string;
    description: string;
    s3Key: string;
    selectedFile?: string; // Only for bulk mode
  }>;
  formData: {
    elr: string;
    structureNo: string;
    date: string;
  };
  mode: "images" | "bulk";
}
```

### **Output Response**

```typescript
interface LambdaResponse {
  statusCode: 200 | 500;
  headers: {
    "Content-Type": "application/json";
    "Access-Control-Allow-Origin": "*";
  };
  body: string; // JSON stringified
}
```

### **Lambda Processing Steps**

1. **Receive payload** with selectedImages, formData, mode
2. **Download images** from S3 using s3Key
3. **Create ZIP** with custom naming: `Photo {number} ^ {description} ^ {date}.jpg`
4. **Add metadata.txt** with project details and defect list
5. **Upload ZIP** to S3 downloads/ folder
6. **Generate presigned URL** (1 hour expiry)
7. **🗑️ Delete ZIP file** after successful upload
8. **Return response** with download URL

## **📦 ZIP File Structure**

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

## **🗄️ Data Persistence**

### **Selected Images Mode**

- **localStorage:** `clean-app-selected-images`
- **AWS DynamoDB:** `mvp-labeler-selected-images` table
- **Auto-save:** On every selection change
- **Cross-session:** Filename matching for persistence

### **Bulk Defects Mode**

- **localStorage:** `clean-app-bulk-data`
- **AWS DynamoDB:** `mvp-labeler-bulk-defects` table
- **Auto-save:** On every defect change
- **Cross-session:** Filename matching for persistence

### **Form Data**

- **localStorage:** `clean-app-form-data`
- **AWS DynamoDB:** `mvp-labeler-form-data` table
- **Auto-save:** On every form change

## **🔧 Key Functions**

### **Frontend Functions**

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

### **Backend Functions**

```typescript
// API Routes
POST /api/download
- Input: { selectedImages, formData, mode }
- Output: { success, downloadUrl, filename, message }

// Lambda Function
download-generator
- Input: LambdaEvent
- Output: LambdaResponse
- Processing: Download → ZIP → Upload → URL → Delete
```

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

## **🔄 Complete Flow**

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

## **⚠️ Important Notes**

### **Data Consistency**

- Both modes produce identical ZIP structure
- Both modes use same file naming convention
- Both modes create metadata.txt file
- Both modes auto-delete ZIP files after upload

### **Error Handling**

- Lambda handles missing images gracefully
- Frontend validates all inputs before API call
- Backend validates payload structure
- Presigned URLs expire after 1 hour

### **Storage Management**

- ZIP files are deleted immediately after upload
- S3 lifecycle policies provide backup cleanup
- Cross-session persistence via filename matching
- Auto-save to both localStorage and AWS

## **🔧 Development Guidelines**

### **When Making Changes:**

1. **Check this schema** before modifying functions
2. **Maintain data structure consistency** between modes
3. **Test both modes** after any changes
4. **Update schema** if data structures change
5. **Preserve auto-save functionality** for both modes

### **Key Dependencies:**

- **Frontend:** React + Zustand + TypeScript
- **Backend:** Express + AWS SDK
- **Lambda:** Node.js + JSZip + AWS SDK
- **Storage:** S3 + DynamoDB + localStorage
- **Deployment:** AWS Lambda + API Gateway

This schema ensures **consistent functionality** and **prevents breaking changes** when modifying the application.
