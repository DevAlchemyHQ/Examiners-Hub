// Test Form Data Persistence
// This script tests if form data is being saved and loaded correctly

const testFormDataPersistence = async () => {
  console.log('🔍 Testing Form Data Persistence...');
  
  // Get user from localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  if (!user?.email) {
    console.error('❌ No user found in localStorage');
    return;
  }
  
  const userId = user.email;
  console.log('👤 Testing for user:', userId);
  
  // Import services
  const { DatabaseService } = await import('./src/lib/services.js');
  
  try {
    // 1. Check current form data in localStorage
    console.log('\n📋 1. Checking localStorage form data...');
    const keys = {
      formData: `formData-${userId}`,
      sessionState: `formData-${userId}-session-state`
    };
    
    const localStorageFormData = JSON.parse(localStorage.getItem(keys.formData) || 'null');
    const localStorageSessionState = JSON.parse(localStorage.getItem(keys.sessionState) || 'null');
    
    console.log('📦 localStorage form data:', localStorageFormData);
    console.log('📦 localStorage session state form data:', localStorageSessionState?.formData);
    
    // 2. Check AWS form data
    console.log('\n📋 2. Checking AWS form data...');
    const projectResult = await DatabaseService.getProject(userId, 'current');
    console.log('📦 AWS project data:', {
      hasProject: !!projectResult.project,
      formData: projectResult.project?.formData,
      sessionStateFormData: projectResult.project?.sessionState?.formData,
      lastUpdated: projectResult.project?.updated_at
    });
    
    // 3. Test saving new form data
    console.log('\n📋 3. Testing form data save...');
    const testFormData = {
      elr: 'TEST_ELR_' + Date.now(),
      structureNo: 'TEST_STRUCTURE_' + Date.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    console.log('💾 Saving test form data:', testFormData);
    
    try {
      await DatabaseService.updateProject(userId, 'current', {
        formData: testFormData,
        sessionState: {
          lastActiveTab: 'images',
          lastActiveTime: Date.now(),
          imageOrder: [],
          selectedImageOrder: [],
          bulkDefectOrder: [],
          panelExpanded: false,
          gridWidth: 4,
          scrollPositions: { imageGrid: 0, selectedPanel: 0 },
          formData: testFormData
        }
      });
      console.log('✅ Test form data saved to AWS successfully');
      
      // 4. Verify the save
      console.log('\n📋 4. Verifying saved form data...');
      const verifyResult = await DatabaseService.getProject(userId, 'current');
      console.log('🔍 Verification - saved form data:', {
        formData: verifyResult.project?.formData,
        sessionStateFormData: verifyResult.project?.sessionState?.formData
      });
      
      // 5. Test loading in a new browser context
      console.log('\n📋 5. Simulating new browser context...');
      console.log('🔄 Clearing localStorage form data...');
      localStorage.removeItem(keys.formData);
      localStorage.removeItem(keys.sessionState);
      
      console.log('🔄 Loading form data from AWS only...');
      const loadResult = await DatabaseService.getProject(userId, 'current');
      console.log('📦 Loaded form data from AWS:', {
        formData: loadResult.project?.formData,
        sessionStateFormData: loadResult.project?.sessionState?.formData
      });
      
      // 6. Recommendations
      console.log('\n📋 6. Recommendations:');
      if (loadResult.project?.formData) {
        console.log('✅ Form data is being saved and loaded correctly from AWS');
      } else if (loadResult.project?.sessionState?.formData) {
        console.log('⚠️ Form data is only in session state, not in main formData field');
      } else {
        console.log('❌ Form data is not being saved or loaded correctly');
      }
      
    } catch (error) {
      console.error('❌ Error during form data test:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during form data persistence test:', error);
  }
};

// Run the test
testFormDataPersistence();
