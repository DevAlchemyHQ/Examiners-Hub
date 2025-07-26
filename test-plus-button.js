// Test script to verify plus button logic
console.log('🧪 Testing plus button logic...');

// Mock DefectTile props
const mockDefectTileProps = {
  id: '1',
  photoNumber: '1',
  description: 'test1',
  selectedFile: 'P5020001.JPG',
  availableFiles: ['P5020001.JPG', 'P5020002.JPG', 'P5020003.JPG'],
  onDelete: () => console.log('Delete called'),
  onDescriptionChange: (value) => console.log('Description changed:', value),
  onFileChange: (fileName) => console.log('File changed:', fileName),
  onPhotoNumberChange: (defectId, oldNumber, newNumber) => console.log('Photo number changed:', { defectId, oldNumber, newNumber }),
  onQuickAdd: () => console.log('Quick add called'),
  isExpanded: false,
  showImages: true,
  images: [],
  setEnlargedImage: () => {},
  isDuplicate: false
};

// Test if onQuickAdd is provided
console.log('📋 DefectTile props check:');
console.log('- onQuickAdd provided:', !!mockDefectTileProps.onQuickAdd);
console.log('- onQuickAdd type:', typeof mockDefectTileProps.onQuickAdd);
console.log('- onQuickAdd value:', mockDefectTileProps.onQuickAdd);

// Simulate the conditional rendering logic
const shouldShowPlusButton = mockDefectTileProps.onQuickAdd !== undefined && mockDefectTileProps.onQuickAdd !== null;
console.log('🔍 Should show plus button:', shouldShowPlusButton);

// Test the button rendering logic
const buttonElement = shouldShowPlusButton ? {
  type: 'button',
  onClick: mockDefectTileProps.onQuickAdd,
  className: 'p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors',
  title: 'Add defect below',
  content: 'Plus icon'
} : null;

console.log('🎯 Button element:', buttonElement);

if (buttonElement) {
  console.log('✅ Plus button should be rendered');
} else {
  console.log('❌ Plus button should NOT be rendered');
}

// Test with missing onQuickAdd
const mockDefectTilePropsNoQuickAdd = {
  ...mockDefectTileProps,
  onQuickAdd: undefined
};

const shouldShowPlusButtonNoQuickAdd = mockDefectTilePropsNoQuickAdd.onQuickAdd !== undefined && mockDefectTilePropsNoQuickAdd.onQuickAdd !== null;
console.log('\n🧪 Test without onQuickAdd:');
console.log('- onQuickAdd provided:', !!mockDefectTilePropsNoQuickAdd.onQuickAdd);
console.log('- Should show plus button:', shouldShowPlusButtonNoQuickAdd);

// Test the actual rendering logic from the component
const renderPlusButton = (onQuickAdd) => {
  if (onQuickAdd) {
    return {
      type: 'button',
      onClick: onQuickAdd,
      className: 'p-1.5 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors',
      title: 'Add defect below',
      content: 'Plus icon'
    };
  }
  return null;
};

console.log('\n🧪 Testing render function:');
console.log('- With onQuickAdd:', renderPlusButton(mockDefectTileProps.onQuickAdd));
console.log('- Without onQuickAdd:', renderPlusButton(undefined));

// Test the actual condition from the component
console.log('\n🧪 Testing actual component condition:');
console.log('- {onQuickAdd && (...)} should render when onQuickAdd is truthy');
console.log('- Current onQuickAdd is truthy:', !!mockDefectTileProps.onQuickAdd);

if (mockDefectTileProps.onQuickAdd) {
  console.log('✅ Plus button should render');
} else {
  console.log('❌ Plus button should NOT render');
} 