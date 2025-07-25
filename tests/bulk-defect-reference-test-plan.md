# Bulk Defect and Reference Document Test Plan

## Overview

This test plan covers the functionality of bulk defect management and reference document viewing in the MVP Labeler application.

## Test Environment

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **Browser**: Chrome (Latest)
- **Test Data**: Sample images and PDFs

## Test Cases

### 1. Bulk Defect Functionality

#### 1.1 Bulk Defect Creation

- [ ] **Add New Defect**

  - Click "Add Defect" button
  - Verify new defect tile appears
  - Verify photo number auto-increments
  - Verify description field is empty and editable
  - Verify file selection dropdown is empty

- [ ] **Photo Number Editing**

  - Edit photo number field
  - Verify validation accepts numbers and letters (e.g., "1", "2a", "3b")
  - Verify validation rejects invalid formats
  - Verify duplicate photo number detection
  - Verify auto-renumbering when sorting is enabled

- [ ] **Description Editing**
  - Enter valid descriptions
  - Verify invalid character validation (no / or \)
  - Verify auto-resize of textarea
  - Verify character limits
  - Verify required field validation

#### 1.2 File Selection

- [ ] **Dropdown Functionality**

  - Verify available files populate dropdown
  - Verify file selection updates defect
  - Verify selected file appears in defect tile
  - Verify deselection works
  - Verify file selection syncs with bulk selected images

- [ ] **Drag and Drop**
  - Drag image from grid to defect tile
  - Verify drop target highlighting
  - Verify file assignment on drop
  - Verify error handling for invalid drops

#### 1.3 Bulk Text Import

- [ ] **Defect Format Parsing**

  - Paste text in format: "Photo 01 ^ description ^ date filename.JPG"
  - Verify parsing extracts photo number, description, date
  - Verify filename matching with uploaded images
  - Verify error handling for malformed text
  - Verify missing image detection

- [ ] **Simple Text Import**
  - Paste simple text (one description per line)
  - Verify auto-numbering of defects
  - Verify description assignment
  - Verify validation of descriptions

#### 1.4 Defect Management

- [ ] **Delete Defect**

  - Delete individual defects
  - Verify removal from list
  - Verify file deselection
  - Verify undo functionality
  - Verify renumbering when sorting enabled

- [ ] **Sorting and Reordering**
  - Enable sorting mode
  - Drag and drop to reorder defects
  - Verify auto-renumbering
  - Verify order persistence
  - Verify disabled state when no defects

#### 1.5 Validation

- [ ] **Individual Defect Validation**

  - Verify each defect requires:
    - Valid photo number format
    - Non-empty description
    - Selected file
    - Valid description characters

- [ ] **Bulk Validation**
  - Verify at least one defect exists
  - Verify at least one defect has selected image
  - Verify form data requirements (ELR, Structure No, Date)
  - Verify subscription status check

### 2. Reference Document Functionality

#### 2.1 PDF Upload and Loading

- [ ] **File Upload**

  - Upload PDF file via file picker
  - Verify file type validation
  - Verify loading states
  - Verify error handling for invalid files
  - Verify file size limits

- [ ] **PDF Rendering**
  - Verify PDF displays correctly
  - Verify page navigation works
  - Verify zoom controls function
  - Verify rotation controls work
  - Verify text layer rendering

#### 2.2 PDF Navigation

- [ ] **Page Navigation**

  - Navigate between pages
  - Verify page counter updates
  - Verify smooth transitions
  - Verify keyboard navigation
  - Verify touch navigation on mobile

- [ ] **Zoom and Pan**
  - Test zoom in/out controls
  - Verify zoom limits (0.5x to 2.0x)
  - Verify smooth zoom transitions
  - Verify pan functionality
  - Verify zoom persistence

#### 2.3 PDF Tools

- [ ] **Rotation**

  - Rotate individual pages
  - Verify rotation state persistence
  - Verify rotation controls visibility
  - Verify rotation limits (0°, 90°, 180°, 270°)

- [ ] **Text Selection**
  - Select text within PDF
  - Verify text copying
  - Verify text search (if available)
  - Verify text layer interaction

#### 2.4 Dual PDF Viewer

- [ ] **Side-by-Side Comparison**
  - Load two PDFs simultaneously
  - Verify independent navigation
  - Verify independent zoom levels
  - Verify independent rotation
  - Verify synchronized scrolling (if implemented)

### 3. Data Persistence

#### 3.1 Bulk Defect Persistence

- [ ] **Auto-Save**

  - Verify defects save to localStorage
  - Verify defects save to AWS DynamoDB
  - Verify cross-session persistence
  - Verify filename matching for images

- [ ] **Data Recovery**
  - Refresh page with existing defects
  - Verify defects reload correctly
  - Verify file selections restore
  - Verify form data persistence

#### 3.2 PDF Persistence

- [ ] **PDF Storage**

  - Verify PDFs save to localStorage
  - Verify PDFs save to AWS S3
  - Verify cross-session persistence
  - Verify file metadata preservation

- [ ] **PDF Recovery**
  - Refresh page with loaded PDFs
  - Verify PDFs reload correctly
  - Verify page states restore
  - Verify zoom/rotation states restore

### 4. Integration Testing

#### 4.1 Bulk Defect to Download

- [ ] **Download Preparation**

  - Create bulk defects with images
  - Verify download button enables
  - Verify validation passes
  - Verify subscription check

- [ ] **ZIP Generation**
  - Trigger bulk download
  - Verify Lambda function call
  - Verify ZIP file creation
  - Verify custom file naming
  - Verify metadata.txt inclusion

#### 4.2 Error Handling

- [ ] **Network Errors**

  - Simulate network failures
  - Verify error messages display
  - Verify retry functionality
  - Verify graceful degradation

- [ ] **Validation Errors**
  - Test invalid inputs
  - Verify error messages
  - Verify form validation
  - Verify user guidance

### 5. Performance Testing

#### 5.1 Bulk Defect Performance

- [ ] **Large Dataset**

  - Test with 100+ defects
  - Verify smooth scrolling
  - Verify responsive UI
  - Verify memory usage

- [ ] **Image Loading**
  - Test with many images
  - Verify lazy loading
  - Verify thumbnail generation
  - Verify selection performance

#### 5.2 PDF Performance

- [ ] **Large PDFs**

  - Test with 50+ page PDFs
  - Verify page loading speed
  - Verify memory management
  - Verify smooth navigation

- [ ] **Multiple PDFs**
  - Test dual PDF viewer
  - Verify memory usage
  - Verify switching performance
  - Verify concurrent loading

### 6. Mobile Testing

#### 6.1 Touch Interactions

- [ ] **Bulk Defect Mobile**

  - Test touch selection
  - Test drag and drop
  - Test text input
  - Test file selection

- [ ] **PDF Mobile**
  - Test pinch to zoom
  - Test touch navigation
  - Test rotation controls
  - Test file upload

### 7. Accessibility Testing

#### 7.1 Screen Reader Support

- [ ] **Bulk Defect Accessibility**

  - Verify ARIA labels
  - Verify keyboard navigation
  - Verify focus management
  - Verify error announcements

- [ ] **PDF Accessibility**
  - Verify PDF text extraction
  - Verify navigation announcements
  - Verify zoom announcements
  - Verify loading states

## Test Data Requirements

### Sample Images

- Various formats (JPG, PNG, HEIC)
- Various sizes (1MB to 10MB)
- Various aspect ratios
- Sample defect photos

### Sample PDFs

- Single page PDFs
- Multi-page PDFs (10-50 pages)
- Large PDFs (>10MB)
- PDFs with text layers
- PDFs with images

### Sample Defect Data

- Valid defect descriptions
- Invalid defect descriptions (with / or \)
- Various photo number formats
- Sample bulk import text

## Success Criteria

### Bulk Defect Functionality

- ✅ All defect CRUD operations work correctly
- ✅ File selection and assignment works
- ✅ Bulk text import parses correctly
- ✅ Validation prevents invalid data
- ✅ Auto-save works reliably
- ✅ Download generates correct ZIP files

### Reference Document Functionality

- ✅ PDF upload and rendering works
- ✅ Navigation controls function properly
- ✅ Zoom and rotation work correctly
- ✅ Dual PDF viewer functions
- ✅ Data persistence works across sessions
- ✅ Performance remains acceptable with large files

### Integration

- ✅ Bulk defects integrate with download system
- ✅ PDF viewer integrates with main application
- ✅ Error handling works gracefully
- ✅ Mobile experience is satisfactory
- ✅ Accessibility requirements are met

## Test Execution

### Manual Testing Steps

1. Start frontend and backend servers
2. Open application in browser
3. Navigate to bulk defects tab
4. Execute test cases systematically
5. Document any issues found
6. Verify fixes work correctly

### Automated Testing (Future)

- Unit tests for defect parsing
- Integration tests for file operations
- E2E tests for complete workflows
- Performance tests for large datasets

## Issue Tracking

- Document all issues with screenshots
- Include browser console logs
- Note reproduction steps
- Track resolution status
- Verify fixes in multiple browsers
