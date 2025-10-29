# MVP Labeler App

A streamlined React application for structural inspection image and defect management with AWS backend.

## Features

- **Image Upload & Management**: Upload and organize inspection images to AWS S3
- **Selected Images Mode**: Select specific images and add individual metadata
- **Bulk Defects Mode**: Bulk defect entry with text parsing
- **Download Packages**: Generate ZIP files with custom naming and metadata
- **AWS Integration**: S3 storage, DynamoDB persistence, Lambda processing
- **Responsive Design**: Works on desktop and mobile
- **Dark Mode**: Built-in dark/light theme support

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Express.js server
- **AWS Services**: S3, DynamoDB, Lambda, Cognito
- **File Handling**: JSZip for package generation
- **UI Components**: Lucide React icons

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd mvp-labeler
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   ```
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   AWS_REGION=eu-west-2
   ```

4. **Start development servers**

   ```bash
   # Terminal 1: Frontend
   npm run dev

   # Terminal 2: Backend API
   npm run server
   ```

## AWS Setup

### Required AWS Services

1. **S3 Bucket**: `mvp-labeler-storage`

   - User uploads folder: `users/{email}/images/`
   - Downloads folder: `downloads/`

2. **DynamoDB Tables**:

   - `user-data`: User metadata and selected images
   - `user-bulk-data`: Bulk defects data

3. **Lambda Function**: `download-generator`

   - Processes download requests
   - Creates ZIP files with custom naming
   - Generates presigned URLs

4. **Cognito User Pool**: User authentication

### Lambda Function Configuration

The Lambda function uses CommonJS syntax and requires these dependencies:

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `jszip`

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/         # Layout components
│   ├── ImageGrid.tsx   # Image grid display
│   ├── ImageUpload.tsx # File upload
│   ├── SelectedImagesPanel.tsx # Selected images UI
│   └── DownloadButton.tsx # Download functionality
├── store/              # Zustand stores
│   ├── metadataStore.ts # Selected images & bulk data
│   ├── authStore.ts    # Authentication
│   └── layoutStore.ts  # UI state
├── hooks/              # Custom React hooks
│   └── useValidation.ts # Validation logic
├── utils/              # Utility functions
│   └── downloadTransformers.ts # S3 key transformation logic
├── lib/                # AWS configurations
├── api/                # API routes
│   └── download.js     # Download API endpoint
└── types/              # TypeScript type definitions
```

## User Workflows

### Selected Images Mode

1. Upload images to S3
2. Select specific images from grid
3. Enter metadata for each selected image:
   - Photo Number (e.g., "1", "2", "3")
   - Description (e.g., "crack in wall", "rewwe")
4. Enter bulk metadata:
   - ELR (e.g., "ERE")
   - Structure Number (e.g., "343")
   - Date (e.g., "2025-07-02")
5. Download → ZIP with custom named files

### Bulk Defects Mode

1. Upload images to S3
2. Create "bulk defects" with metadata:
   - Photo Number (e.g., "1")
   - Description (e.g., "rewwe")
   - Select photos from dropdown
3. Enter bulk metadata:
   - ELR (e.g., "ERE")
   - Structure Number (e.g., "343")
   - Date (e.g., "2025-07-02")
4. Download → ZIP with custom named files

## ZIP File Format

All downloads include:

- **Custom named images**: `Photo {number} ^ {description} ^ {date}.jpg`
- **Metadata file**: `metadata.txt` with project details and file list

Example:

```
Photo 1 ^ rewwe ^ 02-07-25.jpg
Photo 2 ^ crack in wall ^ 02-07-25.jpg
metadata.txt
```

## S3 Key Handling & Transformation

### S3 Key Storage Strategy

The application uses a two-tier approach for S3 key management:

1. **Application Storage**: S3 keys are stored as filenames only (e.g., `1753041306448-PB080003 copy.JPG`)
2. **Transformation**: Full S3 paths are constructed during download processing

### Transformation Functions

Located in `src/utils/downloadTransformers.ts` and `src/utils/downloadTransformers.js`:

- **Priority Logic**: Always prefer `publicUrl` over stored `s3Key` for accuracy
- **URL Decoding**: Handles spaces in filenames using `decodeURIComponent()`
- **Fallback Chain**:
  1. Extract from `publicUrl` (most reliable)
  2. Use stored `s3Key` with full path construction
  3. Construct from image ID and filename

### Key Changes Made

1. **metadataStore.ts**: Store S3 keys as filenames only
2. **downloadTransformers.ts/js**: Prioritize publicUrl extraction
3. **URL Decoding**: Handle spaces in filenames correctly
4. **Consistent Logic**: Both TypeScript and JavaScript versions updated

## Available Scripts

- `npm run dev` - Start frontend development server
- `npm run server` - Start backend API server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Recent Fixes

### S3 Key Handling (Latest Fix)

- ✅ **PublicUrl Priority**: Transformation functions now prioritize publicUrl over stored s3Key
- ✅ **URL Decoding**: Added `decodeURIComponent()` to handle spaces in filenames
- ✅ **Consistent Storage**: Application stores S3 keys as filenames only
- ✅ **Accurate Extraction**: Full S3 paths constructed from publicUrl during download
- ✅ **Both Modes Fixed**: Bulk defects and selected images modes now work correctly

### Image Grid Sorting (Latest Fix)

- ✅ **Photo Number Order**: Images now display by photo number (P1080001, P1080005, P1080010)
- ✅ **Pattern Recognition**: Extracts numbers after "00" in filenames like P1080001 → 01
- ✅ **Numerical Sorting**: Sorts by the actual photo number (01, 05, 10) not alphabetically
- ✅ **Fallback Logic**: Falls back to timestamp sorting for non-photo-numbered images
- ✅ **Consistent Display**: Both uploaded and S3-loaded images maintain photo number order

### Validation Fixes (Latest Fix)

- ✅ **Description Validation**: Download button now properly checks for empty descriptions
- ✅ **Bulk Mode Validation**: Added description validation for bulk defects
- ✅ **Consistent Rules**: Both modes now require descriptions for non-sketch images
- ✅ **Error Messages**: Clear error messages for missing descriptions and invalid characters

### Scrolling Improvements (Latest Fix)

- ✅ **Independent Scrolling**: Each section (Image Grid, Selected Images, Bulk Defects) now has independent scrolling
- ✅ **Static Page Layout**: Main page layout remains static while individual sections scroll
- ✅ **Custom Scrollbars**: Added styled scrollbars with dark mode support
- ✅ **Touch Scrolling**: Optimized for touch devices with smooth scrolling
- ✅ **Overscroll Prevention**: Prevents page bounce when scrolling within components

### Defect Sets Auto-Save (Latest Fix)

- ✅ **Auto-Save on Modifications**: Defect sets automatically save on every tile modification
- ✅ **Dual Storage**: Saves to both localStorage (immediate) and DynamoDB (cross-device)
- ✅ **Smart Filtering**: Load tray shows only defect sets matching current ELR/Structure
- ✅ **Latest First**: Defect sets sorted by latest modification at the top
- ✅ **Enhanced UI**: Improved load tray with defect/image counts and timestamps
- ✅ **Incognito Support**: Fixed visibility issues in incognito mode

### Bulk Validation Fix (Latest Fix)

- ✅ **Complete Image Validation**: Now checks ALL defects have images (not just at least one)
- ✅ **Duplicate Detection**: Identifies and reports duplicate photo numbers
- ✅ **Missing Description Check**: Validates all defects have descriptions
- ✅ **Detailed Error Messages**: Shows specific counts and issues
- ✅ **Button State Accuracy**: Download button only turns green when ALL issues are resolved

### Selected Images Mode (Fixed)

- ✅ **Module syntax**: Converted Lambda from ES6 to CommonJS
- ✅ **Custom file naming**: Implemented proper naming for images mode
- ✅ **Metadata.txt creation**: Added metadata file generation
- ✅ **Validation**: Enhanced validation for photo numbers and descriptions
- ✅ **Persistence**: Fixed localStorage and AWS dual-save system

### Lambda Function (Updated)

- ✅ **CommonJS syntax**: Fixed import/export issues
- ✅ **Dependencies**: Proper @aws-sdk/client-s3 usage
- ✅ **Error handling**: Improved error logging and handling
- ✅ **Auto-deletion**: ZIP files are cleaned up after download

## License

MIT

# Trigger Amplify deployment

# Amplify deployment trigger

# Reverted to working commit 7f3b474
