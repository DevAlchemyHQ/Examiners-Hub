// Test to verify database persistence
const { DatabaseService } = require('./src/lib/services.ts');

async function testDatabasePersistence() {
  console.log('🧪 TESTING DATABASE PERSISTENCE');
  console.log('================================\n');

  const testUserEmail = 'test@example.com';
  
  try {
    // Test 1: Save form data
    console.log('📝 Test 1: Saving form data...');
    const formData = {
      elr: 'TEST123',
      structureNo: '456',
      date: '2025-01-20'
    };
    
    const formResult = await DatabaseService.updateProject(testUserEmail, 'current', { formData });
    console.log('✅ Form data save result:', formResult.error ? 'FAILED' : 'SUCCESS');
    if (formResult.error) console.error('Error:', formResult.error);

    // Test 2: Save bulk defects
    console.log('\n📝 Test 2: Saving bulk defects...');
    const bulkDefects = [
      {
        photoNumber: '1',
        description: 'Test defect 1',
        selectedFile: 'test-image-1.jpg'
      },
      {
        photoNumber: '2', 
        description: 'Test defect 2',
        selectedFile: 'test-image-2.jpg'
      }
    ];
    
    const bulkResult = await DatabaseService.updateBulkDefects(testUserEmail, bulkDefects);
    console.log('✅ Bulk defects save result:', bulkResult.error ? 'FAILED' : 'SUCCESS');
    if (bulkResult.error) console.error('Error:', bulkResult.error);

    // Test 3: Save selected images
    console.log('\n📝 Test 3: Saving selected images...');
    const selectedImages = [
      {
        id: 'img-1',
        fileName: 'test-image-1.jpg'
      },
      {
        id: 'img-2',
        fileName: 'test-image-2.jpg'
      }
    ];
    
    const selectedResult = await DatabaseService.updateSelectedImages(testUserEmail, selectedImages);
    console.log('✅ Selected images save result:', selectedResult.error ? 'FAILED' : 'SUCCESS');
    if (selectedResult.error) console.error('Error:', selectedResult.error);

    // Test 4: Load form data
    console.log('\n📝 Test 4: Loading form data...');
    const loadFormResult = await DatabaseService.getProject(testUserEmail, 'current');
    console.log('✅ Form data load result:', loadFormResult.error ? 'FAILED' : 'SUCCESS');
    if (loadFormResult.error) {
      console.error('Error:', loadFormResult.error);
    } else {
      console.log('📊 Loaded form data:', loadFormResult.project?.formData);
    }

    // Test 5: Load bulk defects
    console.log('\n📝 Test 5: Loading bulk defects...');
    const loadBulkResult = await DatabaseService.getBulkDefects(testUserEmail);
    console.log('✅ Bulk defects load result:', loadBulkResult.error ? 'FAILED' : 'SUCCESS');
    if (loadBulkResult.error) {
      console.error('Error:', loadBulkResult.error);
    } else {
      console.log('📊 Loaded bulk defects:', loadBulkResult.defects?.length || 0);
    }

    // Test 6: Load selected images
    console.log('\n📝 Test 6: Loading selected images...');
    const loadSelectedResult = await DatabaseService.getSelectedImages(testUserEmail);
    console.log('✅ Selected images load result:', loadSelectedResult.error ? 'FAILED' : 'SUCCESS');
    if (loadSelectedResult.error) {
      console.error('Error:', loadSelectedResult.error);
    } else {
      console.log('📊 Loaded selected images:', loadSelectedResult.selectedImages?.length || 0);
    }

    console.log('\n✅ DATABASE PERSISTENCE TEST COMPLETED');
    console.log('📋 Summary: All save/load operations tested');
    
  } catch (error) {
    console.error('❌ Database persistence test failed:', error);
  }
}

// Run the test
testDatabasePersistence(); 