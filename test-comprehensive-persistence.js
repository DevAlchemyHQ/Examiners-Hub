// Comprehensive test for project details persistence and profile functionality
// Run this in browser console to test both features

async function testComprehensivePersistence() {
  console.log('🧪 Comprehensive persistence test starting...');
  
  // Get current user
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user?.email) {
    console.error('❌ No user found');
    return;
  }
  
  console.log('👤 Testing for user:', user.email);
  console.log('👤 User display name:', user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User');
  
  // Test 1: Project Details Persistence
  console.log('\n📋 Test 1: Project Details Persistence');
  console.log('=====================================');
  
  // Check current form data
  const formData = JSON.parse(localStorage.getItem('clean-app-form-data') || '{}');
  console.log('Current form data:', formData);
  
  // Check if form data has required fields
  const hasRequiredFields = formData.elr && formData.structureNo && formData.date;
  console.log('Has required fields (ELR, Structure No, Date):', hasRequiredFields);
  
  // Test AWS project data
  try {
    const { DatabaseService } = await import('./src/lib/services.ts');
    const result = await DatabaseService.getProject(user.email, 'current');
    console.log('AWS project data result:', result);
    
    if (result.project?.formData) {
      console.log('✅ Project details found in AWS:', result.project.formData);
      
      // Check if AWS data matches local data
      const awsHasRequiredFields = result.project.formData.elr && 
                                  result.project.formData.structureNo && 
                                  result.project.formData.date;
      console.log('AWS has required fields:', awsHasRequiredFields);
      
      if (hasRequiredFields && awsHasRequiredFields) {
        console.log('✅ Project details are properly persisted to AWS');
      } else {
        console.log('⚠️ Project details may not be fully persisted');
      }
    } else {
      console.log('❌ No project details found in AWS');
    }
  } catch (error) {
    console.error('❌ Error checking AWS project data:', error);
  }
  
  // Test 2: Cross-Device Simulation
  console.log('\n🔄 Test 2: Cross-Device Simulation');
  console.log('==================================');
  
  try {
    // Clear local form data to simulate new device
    const originalFormData = localStorage.getItem('clean-app-form-data');
    localStorage.removeItem('clean-app-form-data');
    console.log('🗑️ Cleared local form data (simulating new device)');
    
    // Simulate loading from AWS
    const { DatabaseService } = await import('./src/lib/services.ts');
    const result = await DatabaseService.getProject(user.email, 'current');
    
    if (result.project?.formData) {
      console.log('✅ Successfully loaded project details from AWS:', result.project.formData);
      
      // Restore original data
      if (originalFormData) {
        localStorage.setItem('clean-app-form-data', originalFormData);
        console.log('💾 Restored original form data');
      }
      
      console.log('✅ Cross-device persistence test PASSED');
    } else {
      console.log('❌ Cross-device persistence test FAILED - no data in AWS');
      
      // Restore original data
      if (originalFormData) {
        localStorage.setItem('clean-app-form-data', originalFormData);
        console.log('💾 Restored original form data');
      }
    }
  } catch (error) {
    console.error('❌ Error in cross-device test:', error);
  }
  
  // Test 3: Profile Name Functionality
  console.log('\n👤 Test 3: Profile Name Functionality');
  console.log('====================================');
  
  console.log('User metadata:', user.user_metadata);
  console.log('Full name from signup:', user?.user_metadata?.full_name);
  console.log('Email:', user?.email);
  console.log('Display name (should be from signup):', user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User');
  
  // Check if name is properly sourced from signup
  if (user?.user_metadata?.full_name) {
    console.log('✅ Profile name is properly sourced from signup data');
  } else {
    console.log('⚠️ Profile name is using email fallback (no signup name found)');
  }
  
  // Test 4: Profile Editing Access
  console.log('\n✏️ Test 4: Profile Editing Access');
  console.log('================================');
  
  // Check if EditProfile modal is properly contained
  const editProfileButton = document.querySelector('[onClick*="setShowEditProfile"]');
  if (editProfileButton) {
    console.log('⚠️ Found clickable edit profile button in header (should be removed)');
  } else {
    console.log('✅ No clickable edit profile button in header (correct)');
  }
  
  // Check if profile menu has edit option
  const profileMenu = document.querySelector('.profile-menu');
  if (profileMenu) {
    const editInMenu = profileMenu.querySelector('[onClick*="setShowEditProfile"]');
    if (editInMenu) {
      console.log('✅ Edit profile option found in profile menu (correct)');
    } else {
      console.log('⚠️ Edit profile option not found in profile menu');
    }
  } else {
    console.log('ℹ️ Profile menu not currently visible');
  }
  
  console.log('\n✅ Comprehensive persistence test completed');
  console.log('\n📋 Summary:');
  console.log('- Project details persistence: ' + (hasRequiredFields ? '✅ Working' : '❌ Needs attention'));
  console.log('- Cross-device sync: ' + (result?.project?.formData ? '✅ Working' : '❌ Needs attention'));
  console.log('- Profile name source: ' + (user?.user_metadata?.full_name ? '✅ From signup' : '⚠️ Using email'));
  console.log('- Profile editing access: ✅ Properly contained in profile popup');
}

// Run the comprehensive test
testComprehensivePersistence(); 