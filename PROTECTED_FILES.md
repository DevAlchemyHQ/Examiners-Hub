# 🔒 PROTECTED FILES - DO NOT MODIFY WITHOUT APPROVAL

## Core Business Logic (CRITICAL - NO CHANGES)

These files contain the core business logic and should NOT be modified unless explicitly requested:

### State Management

- `src/store/metadataStore.ts` - Core application state
- `src/store/authStore.ts` - Authentication logic
- `src/store/projectStore.ts` - Project management

### Data Persistence

- `src/lib/services.ts` - AWS/DynamoDB operations
- `src/lib/dynamodb.ts` - Database operations
- `src/utils/downloadTransformers.ts` - Download logic

### Core Components

- `src/components/SelectedImagesPanel.tsx` - Image selection logic
- `src/components/ImageUpload.tsx` - Upload functionality
- `src/components/DownloadButton.tsx` - Download functionality
- `src/components/BulkTextInput.tsx` - Bulk defect handling

### Lambda Functions

- `lambda-package/simple-lambda/index.js` - Backend download logic

## Development Rules

### ✅ ALLOWED Changes

- UI/UX improvements (colors, layout, text)
- New features in separate components
- Bug fixes with explicit approval
- Performance optimizations

### ❌ FORBIDDEN Changes

- Core state management logic
- Data persistence patterns
- Download/upload business logic
- Authentication flows
- Database schemas

### 🔄 Change Process

1. Create feature branch: `git checkout -b feature/stripe-integration`
2. Only modify new files or explicitly approved files
3. Test thoroughly before merging
4. Get approval for any protected file changes

## Current Working State

- ✅ Image upload/selection working
- ✅ Bulk defects working
- ✅ Save/load defect sets working
- ✅ Download functionality working
- ✅ AWS persistence working

**DO NOT BREAK THESE FEATURES**
