// Test script to verify project details persistence
// Run this in browser console to test project details save/load

async function testProjectPersistence() {
  console.log('🧪 Testing project details persistence...');
  
  // Get current user
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user?.email) {
    console.error('❌ No user found');
    return;
  }
  
  console.log('👤 Testing for user:', user.email);
  
  // Test 1: Check if project details are being saved
  console.log('\n📝 Test 1: Checking current form data...');
  const formData = JSON.parse(localStorage.getItem('clean-app-form-data') || '{}');
  console.log('Current form data:', formData);
  
  // Test 2: Check AWS project data
  console.log('\n☁️ Test 2: Checking AWS project data...');
  try {
    const { DatabaseService } = await import('./src/lib/services.ts');
    const result = await DatabaseService.getProject(user.email, 'current');
    console.log('AWS project data:', result);
    
    if (result.project?.formData) {
      console.log('✅ Project details found in AWS:', result.project.formData);
    } else {
      console.log('⚠️ No project details found in AWS');
    }
  } catch (error) {
    console.error('❌ Error checking AWS project data:', error);
  }
  
  // Test 3: Simulate cross-device scenario
  console.log('\n🔄 Test 3: Simulating cross-device load...');
  try {
    // Clear local form data
    localStorage.removeItem('clean-app-form-data');
    console.log('🗑️ Cleared local form data');
    
    // Simulate loading from AWS
    const { DatabaseService } = await import('./src/lib/services.ts');
    const result = await DatabaseService.getProject(user.email, 'current');
    
    if (result.project?.formData) {
      console.log('✅ Successfully loaded project details from AWS:', result.project.formData);
      
      // Save back to localStorage
      localStorage.setItem('clean-app-form-data', JSON.stringify(result.project.formData));
      console.log('💾 Saved project details back to localStorage');
    } else {
      console.log('❌ No project details found in AWS for cross-device test');
    }
  } catch (error) {
    console.error('❌ Error in cross-device test:', error);
  }
  
  console.log('\n✅ Project persistence test completed');
}

// Run the test
testProjectPersistence(); 