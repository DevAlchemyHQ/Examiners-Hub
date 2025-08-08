// Debug Cross-Device Persistence
// This script tests what data is being saved and retrieved from AWS

const testCrossDevicePersistence = async () => {
  console.log('🔍 Testing Cross-Device Persistence...');
  
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
    // 1. Test Project Data (formData, sessionState, sortPreferences)
    console.log('\n📋 1. Testing Project Data...');
    const projectResult = await DatabaseService.getProject(userId, 'current');
    console.log('📦 Project data from AWS:', {
      hasProject: !!projectResult.project,
      formData: projectResult.project?.formData,
      sessionState: projectResult.project?.sessionState,
      sortPreferences: projectResult.project?.sortPreferences,
      lastUpdated: projectResult.project?.updated_at
    });
    
    // 2. Test Bulk Defects
    console.log('\n📋 2. Testing Bulk Defects...');
    const bulkResult = await DatabaseService.getBulkDefects(userId);
    console.log('📦 Bulk defects from AWS:', {
      count: bulkResult.defects?.length || 0,
      sample: bulkResult.defects?.[0] || null,
      error: bulkResult.error
    });
    
    // 3. Test Selected Images
    console.log('\n📋 3. Testing Selected Images...');
    const selectedResult = await DatabaseService.getSelectedImages(userId);
    console.log('📦 Selected images from AWS:', {
      count: selectedResult?.length || 0,
      sample: selectedResult?.[0] || null
    });
    
    // 4. Test Instance Metadata
    console.log('\n📋 4. Testing Instance Metadata...');
    const instanceResult = await DatabaseService.getInstanceMetadata(userId);
    console.log('📦 Instance metadata from AWS:', {
      hasData: !!instanceResult,
      data: instanceResult
    });
    
    // 5. Test localStorage data
    console.log('\n📋 5. Testing localStorage Data...');
    const keys = {
      formData: `formData-${userId}`,
      bulkData: `bulkData-${userId}`,
      selections: `selections-${userId}`,
      sessionState: `formData-${userId}-session-state`
    };
    
    const localStorageData = {
      formData: JSON.parse(localStorage.getItem(keys.formData) || 'null'),
      bulkData: JSON.parse(localStorage.getItem(keys.bulkData) || 'null'),
      selections: JSON.parse(localStorage.getItem(keys.selections) || 'null'),
      sessionState: JSON.parse(localStorage.getItem(keys.sessionState) || 'null')
    };
    
    console.log('📦 localStorage data:', {
      formData: localStorageData.formData,
      bulkDataCount: localStorageData.bulkData?.length || 0,
      selectionsCount: localStorageData.selections?.length || 0,
      sessionState: localStorageData.sessionState
    });
    
    // 6. Compare AWS vs localStorage
    console.log('\n📋 6. Comparing AWS vs localStorage...');
    const comparison = {
      formData: {
        aws: !!projectResult.project?.formData,
        local: !!localStorageData.formData,
        match: JSON.stringify(projectResult.project?.formData) === JSON.stringify(localStorageData.formData)
      },
      bulkDefects: {
        aws: bulkResult.defects?.length || 0,
        local: localStorageData.bulkData?.length || 0,
        match: bulkResult.defects?.length === localStorageData.bulkData?.length
      },
      selectedImages: {
        aws: selectedResult?.length || 0,
        local: localStorageData.selections?.length || 0,
        match: selectedResult?.length === localStorageData.selections?.length
      },
      sessionState: {
        aws: !!projectResult.project?.sessionState,
        local: !!localStorageData.sessionState,
        match: JSON.stringify(projectResult.project?.sessionState) === JSON.stringify(localStorageData.sessionState)
      }
    };
    
    console.log('🔍 Data Comparison:', comparison);
    
    // 7. Identify missing data
    console.log('\n📋 7. Identifying Missing Data...');
    const issues = [];
    
    if (!projectResult.project?.formData && !localStorageData.formData) {
      issues.push('❌ No form data found in AWS or localStorage');
    }
    
    if (!projectResult.project?.sessionState && !localStorageData.sessionState) {
      issues.push('❌ No session state found in AWS or localStorage');
    }
    
    if (bulkResult.defects?.length === 0 && localStorageData.bulkData?.length === 0) {
      issues.push('❌ No bulk defects found in AWS or localStorage');
    }
    
    if (selectedResult?.length === 0 && localStorageData.selections?.length === 0) {
      issues.push('❌ No selected images found in AWS or localStorage');
    }
    
    if (issues.length === 0) {
      console.log('✅ All data appears to be present');
    } else {
      console.log('⚠️ Issues found:', issues);
    }
    
    // 8. Test saving data
    console.log('\n📋 8. Testing Data Save...');
    const testFormData = {
      elr: 'TEST_ELR',
      structureNo: 'TEST_STRUCTURE',
      date: new Date().toISOString().split('T')[0]
    };
    
    const testSessionState = {
      lastActiveTab: 'images',
      lastActiveTime: Date.now(),
      imageOrder: [],
      selectedImageOrder: [],
      bulkDefectOrder: [],
      panelExpanded: false,
      gridWidth: 4,
      scrollPositions: { imageGrid: 0, selectedPanel: 0 },
      formData: testFormData
    };
    
    try {
      await DatabaseService.updateProject(userId, 'current', {
        formData: testFormData,
        sessionState: testSessionState,
        sortPreferences: {
          defectSortDirection: 'asc',
          sketchSortDirection: 'desc'
        }
      });
      console.log('✅ Test data saved to AWS successfully');
      
      // Verify the save
      const verifyResult = await DatabaseService.getProject(userId, 'current');
      console.log('🔍 Verification - saved data:', {
        formData: verifyResult.project?.formData,
        sessionState: verifyResult.project?.sessionState,
        sortPreferences: verifyResult.project?.sortPreferences
      });
      
    } catch (error) {
      console.error('❌ Error saving test data:', error);
    }
    
  } catch (error) {
    console.error('❌ Error during cross-device persistence test:', error);
  }
};

// Run the test
testCrossDevicePersistence();
