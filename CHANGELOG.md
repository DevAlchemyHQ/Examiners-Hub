# 📝 Changelog

All notable changes to the MVP Labeler application will be documented in this file.

## [Latest] - 2025-01-21

### Fixed

- **Bulk Validation Logic**: Fixed download button turning green when defects have missing images or duplicate entries
  - Now validates ALL defects have images (not just at least one)
  - Added duplicate photo number detection
  - Enhanced error messages to show specific counts
  - Download button only enables when ALL validation issues are resolved
- **Defect Sets Auto-Save**: Enhanced auto-save functionality with improved error handling
- **Scrollable Sections**: Fixed independent scrolling for image grid, selected images panel, and bulk defect tiles

### Added

- **Enhanced Validation**: More detailed validation messages for bulk mode
- **Improved UI Feedback**: Better visual indicators for validation state

## [2025-01-20] - S3 Key Handling Fix

### 🐛 Fixed

- **ZIP Downloads**: Fixed issue where ZIP files contained only text files instead of images
- **S3 Key Mismatch**: Resolved S3 key storage and extraction inconsistencies
- **URL Encoding**: Fixed spaces in filenames being URL-encoded as "%20"
- **Transformation Logic**: Prioritized publicUrl extraction over stored s3Key
- **Image Grid Sorting**: Fixed images being displayed from newest to oldest instead of chronological order
- **Photo Number Sorting**: Images now sort by photo number (P1080001, P1080005, P1080010) instead of alphabetically
- **Download Button Validation**: Fixed download button turning green when images have only numbers without descriptions
- **Bulk Mode Validation**: Added missing description validation for bulk defects
- **Scrolling Behavior**: Fixed page scrolling when users want to scroll within individual sections
- **Defect Sets Visibility**: Fixed defect sets not appearing in incognito mode

### 🔧 Changed

- **S3 Key Storage**: Application now stores S3 keys as filenames only instead of full paths
- **Transformation Functions**: Updated to always prefer publicUrl over stored s3Key for accuracy
- **URL Decoding**: Added `decodeURIComponent()` to handle spaces in filenames correctly
- **Consistent Logic**: Both TypeScript and JavaScript transformation functions updated
- **Image Sorting**: Images now sort by photo number instead of timestamp or filename
- **Validation Logic**: Enhanced description validation to check for empty descriptions
- **Layout Structure**: Updated main content layout to use fixed height with independent scrolling sections
- **Scrollbar Styling**: Added custom scrollbar styles with dark mode support
- **Defect Sets Auto-Save**: Added automatic saving on every tile modification with debouncing
- **Defect Sets Filtering**: Load tray now shows only defect sets matching current ELR/Structure
- **Defect Sets UI**: Enhanced load tray with defect counts, image counts, and better timestamps
- **Pattern Recognition**: Added regex pattern `/P\d{3}00(\d+)/` to extract photo numbers from filenames
- **Type Definitions**: Updated ImageMetadata interface to include fileName and s3Key properties

### 📁 Files Modified

- `src/store/metadataStore.ts` - S3 key storage strategy and image sorting
- `src/utils/downloadTransformers.ts` - TypeScript transformation logic
- `src/utils/downloadTransformers.js` - JavaScript transformation logic
- `src/types.ts` - Updated ImageMetadata interface

### 📚 Documentation Added

- `README.md` - Added S3 Key Handling & Transformation section
- `SCHEMA.md` - Updated data structures and API communication
- `DEVELOPMENT.md` - Added debugging and implementation details
- `S3_KEY_HANDLING.md` - Technical documentation for S3 key handling

### 🧪 Testing

- `test-fixed-app.js` - Integration tests for both modes
- `test-debug-publicurl-extraction.js` - Debug publicUrl extraction
- `test-debug-logic.js` - Debug transformation logic
- `test-image-sorting.js` - Verify image sorting logic

### ✅ Verification

- Both bulk defects and selected images modes now work correctly
- Transformation functions show "Extracted S3 key from publicUrl"
- Lambda receives correct S3 keys that match actual S3 filenames
- ZIP files now contain images and metadata instead of just text files
- Images display in photo number order (P1080001, P1080005, P1080010)

## [Previous Versions]

### Selected Images Mode Fixes

- ✅ **Module syntax**: Converted Lambda from ES6 to CommonJS
- ✅ **Custom file naming**: Implemented proper naming for images mode
- ✅ **Metadata.txt creation**: Added metadata file generation
- ✅ **Validation**: Enhanced validation for photo numbers and descriptions
- ✅ **Persistence**: Fixed localStorage and AWS dual-save system

### Lambda Function Updates

- ✅ **CommonJS syntax**: Fixed import/export issues
- ✅ **Dependencies**: Proper @aws-sdk/client-s3 usage
- ✅ **Error handling**: Improved error logging and handling
- ✅ **Auto-deletion**: ZIP files are cleaned up after download

---

## 📋 Version History

- **v1.0.0** - Initial release with basic functionality
- **v1.1.0** - Added bulk defects mode
- **v1.2.0** - Fixed selected images mode and Lambda function
- **v1.3.0** - Fixed S3 key handling and transformation functions (Current)

## 🔗 Related Documentation

- [README.md](./README.md) - User-facing documentation
- [SCHEMA.md](./SCHEMA.md) - Data structure documentation
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development guide
- [S3_KEY_HANDLING.md](./S3_KEY_HANDLING.md) - Technical S3 key handling documentation
