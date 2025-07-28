# 📧 Email Verification System Setup Guide

## 🎯 Overview

This guide will help you set up the complete email verification system for Exametry, including:

- ✅ Email verification for new user registration
- ✅ Password reset functionality
- ✅ Beautiful email templates
- ✅ Paste button for easy code entry
- ✅ Rate limiting and security features

## 🚀 Current Status

### ✅ Completed

- [x] Verification service with AWS SES integration
- [x] DynamoDB table for storing verification codes
- [x] Beautiful email templates (your provided designs)
- [x] Verification code input component with paste button
- [x] Email verification page with cyberpunk styling
- [x] Forgot password flow
- [x] Development mode for testing
- [x] Rate limiting and security features

### 🔧 Setup Required

- [ ] AWS SES domain verification
- [ ] IAM permissions for SES
- [ ] Production email sending configuration

## 📋 Setup Instructions

### 1. AWS SES Domain Verification

#### Step 1: Verify Your Domain

1. Go to [AWS SES Console](https://eu-west-2.console.aws.amazon.com/ses/)
2. Navigate to "Verified identities"
3. Click "Create identity"
4. Select "Domain" and enter `exametry.xyz`
5. Click "Create identity"

#### Step 2: Add DNS Records

AWS will provide you with DNS records to add to your domain:

**TXT Record:**

- Name: `_amazonses.exametry.xyz`
- Value: `[AWS-provided-token]`

**CNAME Records:**

- Name: `[random-string-1]._domainkey.exametry.xyz`
- Value: `[random-string-1].dkim.amazonses.com`

- Name: `[random-string-2]._domainkey.exametry.xyz`
- Value: `[random-string-2].dkim.amazonses.com`

- Name: `[random-string-3]._domainkey.exametry.xyz`
- Value: `[random-string-3].dkim.amazonses.com`

#### Step 3: Wait for Verification

- DNS changes can take up to 72 hours to propagate
- Check the SES console for verification status
- Once verified, you'll see a green checkmark

### 2. IAM Permissions Setup

#### Option A: Using AWS Console (Recommended)

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. Navigate to "Users" → "Exametry_migrate"
3. Click "Add permissions" → "Attach policies directly"
4. Create a new policy with this JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:GetSendQuota",
        "ses:GetSendStatistics",
        "ses:VerifyDomainIdentity",
        "ses:VerifyEmailIdentity",
        "ses:GetIdentityVerificationAttributes",
        "ses:ListIdentities",
        "ses:GetIdentityDkimAttributes",
        "ses:GetIdentityMailFromDomainAttributes",
        "ses:GetIdentityNotificationTopic",
        "ses:GetIdentityPolicies",
        "ses:ListIdentityPolicies",
        "ses:ListVerifiedEmailAddresses"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:UpdateItem"
      ],
      "Resource": [
        "arn:aws:dynamodb:eu-west-2:913524945607:table/mvp-labeler-verification-codes",
        "arn:aws:dynamodb:eu-west-2:913524945607:table/mvp-labeler-verification-codes/index/*"
      ]
    }
  ]
}
```

#### Option B: Using AWS CLI

```bash
# Create the policy
aws iam create-policy \
  --policy-name ExametrySESPolicy \
  --policy-document file://ses-policy.json \
  --description "SES and DynamoDB permissions for Exametry verification system" \
  --region eu-west-2

# Attach to user
aws iam attach-user-policy \
  --user-name Exametry_migrate \
  --policy-arn arn:aws:iam::913524945607:policy/ExametrySESPolicy \
  --region eu-west-2
```

### 3. SES Sandbox Mode

#### Check Current Status

- New SES accounts are in "sandbox mode"
- This limits you to verified email addresses only
- Check your sending limits in the SES console

#### Request Production Access (Optional)

1. Go to [SES Console](https://eu-west-2.console.aws.amazon.com/ses/)
2. Navigate to "Account dashboard"
3. Click "Request production access"
4. Fill out the form explaining your use case
5. Wait for AWS approval (usually 24-48 hours)

### 4. Testing the System

#### Development Mode (Current)

The system is currently in development mode, which means:

- ✅ Emails are logged to console instead of being sent
- ✅ Any 6-digit code will be accepted for verification
- ✅ No SES permissions required for testing

#### Test the Flow

1. Start the development server: `npm run dev`
2. Go to the signup page
3. Enter your email and password
4. Check the browser console for the verification code
5. Enter the code in the verification page
6. Test the forgot password flow

#### Production Mode

To enable production mode:

1. Complete SES domain verification
2. Set up IAM permissions
3. Update the verification service to disable development mode
4. Test with real email addresses

## 🎨 Features Implemented

### Email Templates

- ✅ **Verification Email**: Blue theme with welcome message
- ✅ **Password Reset Email**: Red theme with security focus
- ✅ **Responsive Design**: Works on all devices
- ✅ **Professional Branding**: Exametry branding throughout

### User Interface

- ✅ **6-Digit Code Input**: Individual boxes with auto-advance
- ✅ **Paste Button**: One-click paste for entire code
- ✅ **Auto-Submit**: Automatically submits when code is complete
- ✅ **Clear Code**: Button to clear and start over
- ✅ **Resend Code**: With 60-second countdown
- ✅ **Loading States**: Visual feedback during operations
- ✅ **Error Handling**: Clear error messages
- ✅ **Success Feedback**: Green checkmarks and success messages

### Security Features

- ✅ **Rate Limiting**: 3 codes per hour per email
- ✅ **Code Expiration**: 1-hour expiration time
- ✅ **Secure Generation**: Cryptographically secure random codes
- ✅ **Attempt Tracking**: Prevents brute force attacks
- ✅ **Input Validation**: Only numeric codes accepted

### Database Integration

- ✅ **DynamoDB Table**: `mvp-labeler-verification-codes`
- ✅ **Efficient Queries**: Using GSI for email-type lookups
- ✅ **Automatic Cleanup**: Expired codes are cleaned up
- ✅ **Data Integrity**: Proper error handling and validation

## 🔧 Configuration

### Environment Variables

```bash
# Development mode (default)
NODE_ENV=development

# Production mode
NODE_ENV=production
```

### AWS Configuration

```javascript
// Region
region: "eu-west-2";

// Email sender
Source: "noreply@exametry.xyz";

// DynamoDB table
TableName: "mvp-labeler-verification-codes";
```

## 🚀 Deployment Checklist

### Before Going Live

- [ ] Verify domain in SES console
- [ ] Set up IAM permissions
- [ ] Test with real email addresses
- [ ] Request production access (if needed)
- [ ] Update email templates with final branding
- [ ] Test all user flows
- [ ] Monitor email delivery rates

### Production Monitoring

- [ ] Set up CloudWatch alarms for SES
- [ ] Monitor DynamoDB read/write capacity
- [ ] Track verification success rates
- [ ] Monitor email bounce rates
- [ ] Set up error logging

## 🎯 User Experience Flow

### Registration Flow

```
1. User fills registration form
2. Clicks "Create Account"
3. System sends verification email
4. User receives beautiful email with code
5. User enters 6-digit code (with paste support)
6. Account is verified and activated
7. User is redirected to main app
```

### Password Reset Flow

```
1. User clicks "Forgot Password"
2. Enters email address
3. System sends password reset email
4. User enters reset code
5. User sets new password
6. User is redirected to login
```

## 🆘 Troubleshooting

### Common Issues

#### SES Permission Errors

```
Error: User is not authorized to perform: ses:SendEmail
```

**Solution**: Add SES permissions to IAM user

#### Domain Verification Pending

```
Error: Email address not verified
```

**Solution**: Complete domain verification in SES console

#### DynamoDB Errors

```
Error: Table not found
```

**Solution**: Run `node create-verification-table.js`

#### Development Mode Issues

- Check browser console for verification codes
- Ensure NODE_ENV is set correctly
- Verify all dependencies are installed

### Support

For technical support, contact: infor@exametry.xyz

## 🎉 Success!

Once setup is complete, your users will enjoy:

- ✅ **Professional Experience**: Beautiful email templates
- ✅ **Easy Verification**: One-click paste functionality
- ✅ **Secure Process**: Rate limiting and validation
- ✅ **Mobile Friendly**: Responsive design
- ✅ **Reliable Delivery**: AWS SES infrastructure

The email verification system is now ready to provide a professional, secure, and user-friendly experience for your Exametry users!
