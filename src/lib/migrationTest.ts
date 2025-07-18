// Migration Test - Verify authentication migration is working
import { AuthService, ServiceManager } from './services';

export const testAuthenticationMigration = async () => {
  console.log('\n🧪 === TESTING AUTHENTICATION MIGRATION ===');
  
  // Test 1: Check if AWS auth is enabled
  const featureFlags = ServiceManager.getFeatureFlags();
  console.log('📊 Feature Flags:', featureFlags);
  
  if (featureFlags.AUTH_USE_AWS) {
    console.log('✅ AWS Authentication is ENABLED');
  } else {
    console.log('❌ AWS Authentication is DISABLED');
  }
  
  // Test 2: Test getCurrentUser with AWS
  try {
    console.log('\n🔐 Testing getCurrentUser...');
    const user = await AuthService.getCurrentUser();
    if (user) {
      console.log('✅ getCurrentUser successful:', user);
    } else {
      console.log('❌ getCurrentUser failed - no user returned');
    }
  } catch (error) {
    console.error('❌ getCurrentUser error:', error);
  }
  
  // Test 3: Test signIn with AWS
  try {
    console.log('\n🔐 Testing signIn...');
    const result = await AuthService.signIn('test@example.com', 'password123');
    if (result.user) {
      console.log('✅ signIn successful:', result.user);
    } else {
      console.log('❌ signIn failed:', result.error);
    }
  } catch (error) {
    console.error('❌ signIn error:', error);
  }
  
  // Test 4: Test signUp with AWS
  try {
    console.log('\n🔐 Testing signUp...');
    const result = await AuthService.signUp('newuser@example.com', 'password123');
    if (result.user) {
      console.log('✅ signUp successful:', result.user);
    } else {
      console.log('❌ signUp failed:', result.error);
    }
  } catch (error) {
    console.error('❌ signUp error:', error);
  }
  
  console.log('\n✅ Authentication migration test complete!\n');
};

// Auto-run test when imported
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    testAuthenticationMigration();
  }, 2000); // Wait 2 seconds for app to load
} 