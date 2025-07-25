// Manual User Account Confirmation Script
// Run this to confirm the user account that's causing login issues

console.log('🔐 Manual User Account Confirmation...\n');

// The email that's having issues
const userEmail = 'timndg@gmail.com';

console.log(`📧 Attempting to confirm user: ${userEmail}`);

// Function to confirm user using AWS CLI
async function confirmUserAccount() {
  try {
    console.log('🔧 Using AWS CLI to confirm user...');
    
    // Command to confirm the user
    const command = `aws cognito-idp admin-confirm-sign-up \
      --user-pool-id eu-west-2_opMigZV21 \
      --username ${userEmail}`;
    
    console.log('📋 Running command:', command);
    
    // Note: This would need to be run in a terminal with AWS CLI configured
    console.log('⚠️  Please run this command in your terminal:');
    console.log(command);
    
    console.log('\n✅ After running the command, try logging in again.');
    console.log('🔄 The user should now be confirmed and able to sign in.');
    
  } catch (error) {
    console.error('❌ Error confirming user:', error);
  }
}

// Alternative method using AWS SDK (if available)
async function confirmUserWithSDK() {
  try {
    console.log('🔧 Using AWS SDK to confirm user...');
    
    // This would require the AWS SDK to be available in the browser
    // For now, we'll provide the manual steps
    
    console.log('📋 Manual confirmation steps:');
    console.log('1. Go to AWS Console → Cognito → User Pools');
    console.log('2. Find user pool: eu-west-2_opMigZV21');
    console.log('3. Go to Users tab');
    console.log(`4. Find user: ${userEmail}`);
    console.log('5. Click on the user');
    console.log('6. Click "Confirm user"');
    console.log('7. Try logging in again');
    
  } catch (error) {
    console.error('❌ Error with SDK method:', error);
  }
}

// Show both options
console.log('🛠️  Two ways to confirm the user account:\n');

console.log('📋 Option 1: AWS CLI Command');
confirmUserAccount();

console.log('\n📋 Option 2: AWS Console');
confirmUserWithSDK();

console.log('\n💡 After confirming the user, try logging in again.');
console.log('🔒 The security fixes are in place to prevent future issues.'); 