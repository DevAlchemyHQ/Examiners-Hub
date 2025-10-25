// TEST SCRIPT: Critical Fix Verification
// This script tests the setFormData broadcast fix

console.log('🧪 STARTING CRITICAL FIX TEST');
console.log('📅 Test Date:', new Date().toISOString());
console.log('🔧 Testing Fix: setFormData broadcast (commit 50dc9c4)');

// Test 1: Check if BroadcastChannel is available
console.log('\n📡 Test 1: BroadcastChannel Availability');
if (typeof BroadcastChannel !== 'undefined') {
  console.log('✅ BroadcastChannel is available');
} else {
  console.log('❌ BroadcastChannel is NOT available');
}

// Test 2: Test form data change and broadcast
console.log('\n📝 Test 2: Form Data Change and Broadcast');
let broadcastReceived = false;

// Set up listener for broadcast messages
if (typeof BroadcastChannel !== 'undefined') {
  const testChannel = new BroadcastChannel('exametry-sync');
  
  testChannel.onmessage = (event) => {
    console.log('📡 Broadcast message received:', event.data);
    if (event.data.type === 'formDataUpdate') {
      broadcastReceived = true;
      console.log('✅ Form data broadcast received successfully');
      console.log('📊 Broadcast data:', event.data.data);
    }
  };
  
  // Simulate form data change
  setTimeout(() => {
    console.log('🔄 Simulating form data change...');
    
    // Try to trigger setFormData (this should now work)
    if (window.useMetadataStore) {
      const store = window.useMetadataStore.getState();
      store.setFormData({ 
        elr: 'CRITICAL-FIX-TEST-' + Date.now(),
        structureNo: '999',
        date: '2025-01-25'
      });
      console.log('✅ setFormData called successfully');
    } else {
      console.log('❌ useMetadataStore not available on window');
    }
    
    // Check if broadcast was received
    setTimeout(() => {
      if (broadcastReceived) {
        console.log('✅ BROADCAST TEST PASSED: Messages are being sent');
      } else {
        console.log('❌ BROADCAST TEST FAILED: No messages received');
      }
      
      testChannel.close();
      console.log('\n🏁 Test completed');
    }, 2000);
    
  }, 1000);
} else {
  console.log('❌ Cannot test broadcast - BroadcastChannel not available');
}

// Test 3: Check localStorage for form data
console.log('\n💾 Test 3: localStorage Form Data Check');
const userEmail = 'timndg@gmail.com';
const formDataKey = `formData-${userEmail}`;
const sessionStateKey = `formData-${userEmail}-session-state`;

try {
  const formData = localStorage.getItem(formDataKey);
  const sessionState = localStorage.getItem(sessionStateKey);
  
  console.log('📋 Form Data Key:', formDataKey);
  console.log('📋 Session State Key:', sessionStateKey);
  
  if (formData) {
    console.log('✅ Form data found in localStorage:', JSON.parse(formData));
  } else {
    console.log('⚠️ No form data in localStorage');
  }
  
  if (sessionState) {
    const parsed = JSON.parse(sessionState);
    console.log('✅ Session state found in localStorage');
    console.log('📊 Session state formData:', parsed.formData);
    console.log('📊 Last active time:', parsed.lastActiveTime);
  } else {
    console.log('⚠️ No session state in localStorage');
  }
} catch (error) {
  console.error('❌ Error reading localStorage:', error);
}

console.log('\n🎯 EXPECTED RESULTS:');
console.log('1. ✅ BroadcastChannel should be available');
console.log('2. ✅ setFormData should trigger broadcast');
console.log('3. ✅ Broadcast message should be received');
console.log('4. ✅ Form data should be saved to localStorage');
console.log('5. ✅ Session state should include form data');

console.log('\n📋 Run this script in both browser tabs to test cross-browser sync');
