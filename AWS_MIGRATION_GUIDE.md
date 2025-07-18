# AWS Amplify Migration Guide

## Overview

This project now supports both **Supabase** and **AWS Amplify** services simultaneously. You can gradually migrate features from Supabase to AWS without any downtime.

## Current Status

✅ **Phase 1 Complete**: Service abstraction layer implemented
✅ **Phase 2 Complete**: Feature flags for service switching
✅ **Phase 3 Complete**: Admin panel for service control

## How It Works

### Service Abstraction Layer

- **Location**: `src/lib/services.ts`
- **Purpose**: Provides unified interface for both Supabase and AWS
- **Features**: Authentication, Storage, Profile management

### Feature Flags

- **Location**: `src/lib/services.ts` (FEATURE_FLAGS object)
- **Control**: Service switching via admin panel
- **Default**: All services use Supabase

### Admin Panel

- **Location**: User Profile page (`/app/profile`)
- **Features**: Real-time service switching
- **Visual**: Clear indicators for current service

## Migration Steps

### Step 1: Set Up AWS Amplify (Optional)

```bash
# Install AWS Amplify CLI
sudo npm install -g @aws-amplify/cli

# Configure AWS (if not done already)
amplify configure

# Initialize in project (when ready)
amplify init
```

### Step 2: Add AWS Services

```bash
# Add Authentication (Cognito)
amplify add auth

# Add Storage (S3)
amplify add storage

# Add API (GraphQL)
amplify add api

# Push changes to AWS
amplify push
```

### Step 3: Update Environment Variables

Copy the AWS configuration values to your `.env` file:

```env
VITE_AWS_USER_POOL_ID=your_user_pool_id
VITE_AWS_USER_POOL_WEB_CLIENT_ID=your_client_id
VITE_AWS_S3_BUCKET=your_bucket_name
VITE_AWS_GRAPHQL_ENDPOINT=your_graphql_endpoint
```

### Step 4: Test Service Switching

1. Go to `/app/profile`
2. Use the "Service Configuration" panel
3. Switch services one by one
4. Test functionality after each switch

## Service Migration Order

### 1. Authentication (Low Risk)

- **Current**: Supabase Auth
- **Target**: AWS Cognito
- **Impact**: Login/logout, password reset
- **Testing**: Use admin panel to switch

### 2. Storage (Medium Risk)

- **Current**: Supabase Storage
- **Target**: AWS S3
- **Impact**: File uploads, profile pictures
- **Testing**: Upload files after switching

### 3. Profile Management (Low Risk)

- **Current**: Supabase Database
- **Target**: AWS DynamoDB/GraphQL
- **Impact**: User profiles, settings
- **Testing**: Update profile after switching

### 4. Main Application Data (High Risk)

- **Current**: Supabase Database
- **Target**: AWS DynamoDB/GraphQL
- **Impact**: Images, defects, metadata
- **Testing**: Full application testing

## Testing Strategy

### Before Migration

1. ✅ All features work with Supabase
2. ✅ Backup all data
3. ✅ Document current functionality

### During Migration

1. ✅ Test each service individually
2. ✅ Verify data consistency
3. ✅ Monitor error logs
4. ✅ Rollback if issues arise

### After Migration

1. ✅ Full application testing
2. ✅ Performance comparison
3. ✅ Cost analysis
4. ✅ Remove Supabase dependencies

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Use admin panel to switch back to Supabase
2. **Code Rollback**: Revert to previous git commit
3. **Data Recovery**: Restore from Supabase backups

## Cost Comparison

### Supabase (Current)

- **Free Tier**: 500MB database, 1GB storage
- **Paid**: $25/month for 8GB database, 100GB storage

### AWS Amplify (Target)

- **Free Tier**: 25GB storage, 1M requests/month
- **Paid**: Pay-per-use model

## Benefits of AWS Migration

### Scalability

- ✅ Auto-scaling infrastructure
- ✅ Global CDN
- ✅ Advanced caching

### Integration

- ✅ Native AWS services
- ✅ Lambda functions
- ✅ AI/ML services

### Control

- ✅ Fine-grained permissions
- ✅ Custom domains
- ✅ Advanced monitoring

## Current Implementation

### Files Modified

- `src/lib/aws.ts` - AWS configuration
- `src/lib/services.ts` - Service abstraction
- `src/store/authStore.ts` - Updated auth store
- `src/components/profile/UserProfile.tsx` - Admin panel
- `env.example` - Environment variables

### New Features

- ✅ Service switching without restart
- ✅ Real-time service indicators
- ✅ Graceful fallback handling
- ✅ Comprehensive error logging

## Next Steps

1. **Test Current Implementation**: Verify everything works with Supabase
2. **Set Up AWS Account**: Configure AWS services
3. **Gradual Migration**: Switch services one by one
4. **Full Testing**: Comprehensive testing after each switch
5. **Production Deployment**: Deploy with AWS services

## Support

- **Documentation**: AWS Amplify docs
- **Community**: AWS Amplify Discord
- **Issues**: GitHub repository issues
- **Backup**: Supabase dashboard for data recovery
