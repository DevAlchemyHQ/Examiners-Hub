// Test Amplify URL Access
// This script tests the correct URL structure for the Amplify deployment

const testAmplifyURLs = async () => {
  console.log('🔍 Testing Amplify URL Access...');
  
  const baseURL = 'https://main.d32is7ul5okd2c.amplifyapp.com';
  const testURLs = [
    `${baseURL}/`,
    `${baseURL}/app`,
    `${baseURL}/login`,
    `${baseURL}/dashboard`
  ];
  
  console.log('📋 Testing URLs:');
  testURLs.forEach(url => console.log(`  - ${url}`));
  
  // Test the main app URL
  const mainAppURL = `${baseURL}/app`;
  console.log(`\n🎯 Main App URL: ${mainAppURL}`);
  console.log('📝 This should be the correct URL to access your application');
  
  // Check if we can detect the current page
  if (window.location.href.includes('amplifyapp.com')) {
    console.log('✅ Currently on Amplify deployment');
    console.log('📍 Current URL:', window.location.href);
    
    if (window.location.pathname === '/app') {
      console.log('✅ Correct path detected (/app)');
    } else if (window.location.pathname === '/') {
      console.log('⚠️ On root path - should redirect to /app or show login');
    } else {
      console.log('⚠️ Unexpected path:', window.location.pathname);
    }
  } else {
    console.log('ℹ️ Not currently on Amplify deployment');
  }
  
  // Test if the app is loading
  console.log('\n🔍 Checking if app is loading...');
  
  // Check for common loading indicators
  const loadingIndicators = [
    'Loading...',
    'Initializing...',
    'Please wait...'
  ];
  
  const pageText = document.body.innerText;
  const hasLoadingText = loadingIndicators.some(indicator => 
    pageText.includes(indicator)
  );
  
  if (hasLoadingText) {
    console.log('⏳ App appears to be loading');
  } else if (pageText.trim() === '') {
    console.log('❌ Page appears to be blank - likely 404 error');
  } else {
    console.log('✅ App appears to be loaded');
  }
  
  // Check for JavaScript errors
  console.log('\n🔍 Checking for JavaScript errors...');
  const errorElements = document.querySelectorAll('.error, [class*="error"], [id*="error"]');
  if (errorElements.length > 0) {
    console.log('⚠️ Found potential error elements:', errorElements.length);
  } else {
    console.log('✅ No obvious error elements found');
  }
  
  // Provide recommendations
  console.log('\n📋 Recommendations:');
  console.log('1. Try accessing: https://main.d32is7ul5okd2c.amplifyapp.com/app');
  console.log('2. Clear browser cache and try again');
  console.log('3. Wait 5-10 minutes for Amplify to complete deployment');
  console.log('4. Check Amplify console for build status');
  
  return {
    baseURL,
    mainAppURL,
    currentURL: window.location.href,
    currentPath: window.location.pathname,
    isOnAmplify: window.location.href.includes('amplifyapp.com'),
    pageText: pageText.substring(0, 200) + '...'
  };
};

// Run the test
const result = testAmplifyURLs();
console.log('\n📊 Test Results:', result);
