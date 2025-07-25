// Test script to verify Lambda integration
const testPayload = {
  selectedImages: [
    {
      id: "test1",
      filename: "test-image.jpg",
      s3Key: "users/timsdng@gmail.com/images/test-image.jpg"
    }
  ],
  formData: {
    projectName: "Integration Test",
    description: "Testing Lambda integration"
  }
};

console.log('🧪 Testing Lambda integration...');
console.log('Payload:', JSON.stringify(testPayload, null, 2));

// Simulate the API call
fetch('/api/download', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testPayload)
})
.then(response => response.json())
.then(data => {
  console.log('✅ API Response:', data);
  if (data.success) {
    console.log('🎉 Integration test successful!');
    console.log('📥 Download URL:', data.downloadUrl);
    console.log('📁 Filename:', data.filename);
  } else {
    console.error('❌ Integration test failed:', data.error);
  }
})
.catch(error => {
  console.error('❌ Integration test error:', error);
}); 