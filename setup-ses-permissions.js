import { SESClient, GetSendQuotaCommand, VerifyDomainIdentityCommand, GetIdentityVerificationAttributesCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'eu-west-2' });

async function setupSES() {
  try {
    // Check SES quota
    console.log('📧 Checking SES quota...');
    const quotaCommand = new GetSendQuotaCommand({});
    const quota = await sesClient.send(quotaCommand);
    console.log('✅ SES Quota:', {
      max24HourSend: quota.Max24HourSend,
      maxSendRate: quota.MaxSendRate,
      sentLast24Hours: quota.SentLast24Hours
    });

    // Check if domain is verified
    console.log('\n🔍 Checking domain verification...');
    const domain = 'exametry.xyz';
    const verifyCommand = new VerifyDomainIdentityCommand({
      Domain: domain
    });
    
    try {
      const verification = await sesClient.send(verifyCommand);
      console.log('✅ Domain verification initiated for:', domain);
      console.log('📋 Please add this TXT record to your DNS:');
      console.log('Name: _amazonses.exametry.xyz');
      console.log('Value:', verification.VerificationToken);
    } catch (error) {
      if (error.name === 'AlreadyExistsException') {
        console.log('ℹ️  Domain verification already in progress or completed');
      } else {
        console.error('❌ Error verifying domain:', error.message);
      }
    }

    // Check verification status
    console.log('\n📊 Checking verification status...');
    const statusCommand = new GetIdentityVerificationAttributesCommand({
      Identities: [domain]
    });
    
    try {
      const status = await sesClient.send(statusCommand);
      const domainStatus = status.VerificationAttributes[domain];
      if (domainStatus) {
        console.log('✅ Domain verification status:', domainStatus.VerificationStatus);
        if (domainStatus.VerificationStatus === 'Success') {
          console.log('🎉 Domain is verified and ready to send emails!');
        } else {
          console.log('⏳ Domain verification pending...');
        }
      }
    } catch (error) {
      console.error('❌ Error checking verification status:', error.message);
    }

  } catch (error) {
    console.error('❌ Error setting up SES:', error.message);
    console.log('\n🔧 To fix SES permissions, you need to:');
    console.log('1. Add SES permissions to your IAM user/role');
    console.log('2. Verify your domain in SES console');
    console.log('3. Move out of SES sandbox mode if needed');
  }
}

setupSES(); 