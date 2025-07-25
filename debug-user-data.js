// Debug User Data Leakage
// Run this in the browser console to check for cross-user data issues

console.log('🔍 Debugging User Data Leakage...\n');

// Check current localStorage state
console.log('📋 Current localStorage state:');
const allKeys = Object.keys(localStorage);
allKeys.forEach(key => {
  try {
    const value = localStorage.getItem(key);
    console.log(`  ${key}: ${value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'null'}`);
  } catch (error) {
    console.log(`  ${key}: [Error reading]`);
  }
});

// Check for user-specific data
console.log('\n👤 User-specific data:');
const userKeys = ['user', 'userEmail', 'session', 'isAuthenticated'];
userKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    try {
      const parsed = JSON.parse(value);
      console.log(`  ${key}:`, parsed);
    } catch (error) {
      console.log(`  ${key}: ${value}`);
    }
  } else {
    console.log(`  ${key}: null`);
  }
});

// Check for project data that might belong to other users
console.log('\n📁 Project-related data:');
const projectKeys = [
  'clean-app-form-data',
  'clean-app-bulk-data',
  'clean-app-selected-images',
  'clean-app-selections',
  'viewMode',
  'selected-images',
  'project-data',
  'form-data',
  'image-selections',
  'bulk-data',
  'metadata-storage',
  'pdf-storage'
];

projectKeys.forEach(key => {
  const value = localStorage.getItem(key);
  if (value) {
    console.log(`  ${key}: present (${value.length} chars)`);
  } else {
    console.log(`  ${key}: null`);
  }
});

// Function to clear all user data
window.clearAllUserData = function() {
  console.log('🧹 Clearing all user data...');
  
  const keysToRemove = [
    'user',
    'userEmail', 
    'session',
    'isAuthenticated',
    'clean-app-form-data',
    'clean-app-bulk-data',
    'clean-app-selected-images',
    'clean-app-selections',
    'viewMode',
    'selected-images',
    'project-data',
    'form-data',
    'image-selections',
    'bulk-data',
    'metadata-storage',
    'pdf-storage',
    'pdf1Name',
    'pdf2Name',
    'pageStates1',
    'pageStates2'
  ];
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed: ${key}`);
    } catch (error) {
      console.error(`Error removing key ${key}:`, error);
    }
  });
  
  console.log('✅ All user data cleared');
  console.log('🔄 Please refresh the page and try logging in again');
};

// Function to check if current user matches stored data
window.checkUserConsistency = function() {
  console.log('🔍 Checking user consistency...');
  
  const storedUser = localStorage.getItem('user');
  const storedUserEmail = localStorage.getItem('userEmail');
  
  if (storedUser && storedUserEmail) {
    try {
      const user = JSON.parse(storedUser);
      console.log('📊 User data consistency:');
      console.log(`  Stored user email: ${user.email}`);
      console.log(`  Stored userEmail: ${storedUserEmail}`);
      console.log(`  Match: ${user.email === storedUserEmail ? '✅ YES' : '❌ NO'}`);
      
      if (user.email !== storedUserEmail) {
        console.log('⚠️ WARNING: User data mismatch detected!');
        console.log('   This could indicate cross-user data leakage.');
        console.log('   Run clearAllUserData() to fix this.');
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
  } else {
    console.log('📊 No user data found in localStorage');
  }
};

console.log('\n🛠️ Available debug functions:');
console.log('  - clearAllUserData(): Clear all user data');
console.log('  - checkUserConsistency(): Check if user data is consistent');
console.log('\n💡 If you see cross-user data, run: clearAllUserData()'); 