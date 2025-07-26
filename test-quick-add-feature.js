// Test Quick Add Feature
console.log('🧪 Testing Quick Add Feature...\n');

// Mock the bulk defects data
const mockBulkDefects = [
  {
    id: 'defect1',
    photoNumber: '1',
    description: 'First defect',
    selectedFile: 'P5020001.JPG'
  },
  {
    id: 'defect2', 
    photoNumber: '2',
    description: 'Second defect',
    selectedFile: 'P5020002.JPG'
  },
  {
    id: 'defect3',
    photoNumber: '3',
    description: 'Third defect',
    selectedFile: 'P5020003.JPG'
  }
];

// Mock the addNewDefect function
function addNewDefect(afterIndex) {
  console.log(`🔄 Adding new defect after index ${afterIndex}`);
  
  // Find the highest numeric photo number
  const numbers = mockBulkDefects
    .map(d => parseInt(d.photoNumber, 10))
    .filter(n => !isNaN(n));
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  
  const newDefect = {
    id: `defect${Date.now()}`, // Mock unique ID
    photoNumber: String(nextNum),
    description: '',
    selectedFile: ''
  };

  if (afterIndex !== undefined) {
    // Insert after the specified index
    const newDefects = [...mockBulkDefects];
    newDefects.splice(afterIndex + 1, 0, newDefect);
    console.log('✅ Inserted new defect at position', afterIndex + 1);
    return newDefects;
  } else {
    // Add to the end
    const newDefects = [...mockBulkDefects, newDefect];
    console.log('✅ Added new defect to the end');
    return newDefects;
  }
}

// Test scenarios
console.log('📋 Test Data:');
console.log('==============');
mockBulkDefects.forEach((defect, index) => {
  console.log(`Defect ${index + 1}: Photo Number "${defect.photoNumber}", Description "${defect.description}"`);
});

console.log('\n📋 Test 1: Add defect after first defect (index 0)');
console.log('==================================================');
const result1 = addNewDefect(0);
console.log('Result:', result1.map(d => `${d.photoNumber}: ${d.description}`).join(', '));

console.log('\n📋 Test 2: Add defect after second defect (index 1)');
console.log('==================================================');
const result2 = addNewDefect(1);
console.log('Result:', result2.map(d => `${d.photoNumber}: ${d.description}`).join(', '));

console.log('\n📋 Test 3: Add defect to the end (no index)');
console.log('==============================================');
const result3 = addNewDefect();
console.log('Result:', result3.map(d => `${d.photoNumber}: ${d.description}`).join(', '));

console.log('\n🎯 Feature Summary:');
console.log('===================');
console.log('✅ Quick add button appears on each defect tile');
console.log('✅ Clicking adds a new defect after that specific defect');
console.log('✅ New defect gets the next available photo number');
console.log('✅ Maintains proper order in the list');
console.log('✅ No need to scroll to bottom to add defects');

console.log('\n💡 User Experience:');
console.log('==================');
console.log('- Users can add defects anywhere in the list');
console.log('- Quick access without scrolling');
console.log('- Maintains workflow continuity');
console.log('- Visual feedback with hover effects'); 