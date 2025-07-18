# DynamoDB Setup Guide

## Overview
This guide will help you set up AWS DynamoDB to replace Supabase database operations. DynamoDB has a generous free tier that should cover your needs.

## Free Tier Limits
- **25 GB** of storage
- **25 WCU** (Write Capacity Units) per month  
- **25 RCU** (Read Capacity Units) per month
- **25 GB** of data transfer out

## Step 1: AWS Account Setup

1. **Create AWS Account** (if you don't have one)
   - Go to [AWS Console](https://aws.amazon.com/)
   - Sign up for free account
   - Add payment method (required, but you won't be charged within free tier)

2. **Create IAM User** (for programmatic access)
   - Go to IAM Console
   - Create new user with programmatic access
   - Attach `DynamoDBFullAccess` policy
   - Save Access Key ID and Secret Access Key

## Step 2: DynamoDB Tables

### Create Tables via AWS Console

1. **Go to DynamoDB Console**
2. **Create Table: `profiles`**
   - Table name: `profiles`
   - Partition key: `id` (String)
   - Billing mode: `Pay per request`

3. **Create Table: `projects`**
   - Table name: `projects`
   - Partition key: `id` (String)
   - Billing mode: `Pay per request`

4. **Create Table: `bulk_defects`**
   - Table name: `bulk_defects`
   - Partition key: `id` (String)
   - Billing mode: `Pay per request`

5. **Create Table: `defect_sets`**
   - Table name: `defect_sets`
   - Partition key: `id` (String)
   - Billing mode: `Pay per request`

## Step 3: Environment Variables

Add these to your `.env.local`:

```bash
# AWS Configuration
VITE_AWS_REGION=eu-west-2
VITE_AWS_ACCESS_KEY_ID=your_access_key_id
VITE_AWS_SECRET_ACCESS_KEY=your_secret_access_key

# DynamoDB Tables (optional, defaults are used)
VITE_DYNAMODB_PROFILES_TABLE=profiles
VITE_DYNAMODB_PROJECTS_TABLE=projects
VITE_DYNAMODB_BULK_DEFECTS_TABLE=bulk_defects
VITE_DYNAMODB_DEFECT_SETS_TABLE=defect_sets
```

## Step 4: Install AWS SDK

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

## Step 5: Enable Database Migration

In `src/lib/services.ts`, change:

```typescript
DATABASE_USE_AWS: false, // Change to true when ready
```

## Step 6: Test Migration

1. **Enable database feature flag:**
   ```typescript
   ServiceManager.enableAWSFeature('DATABASE_USE_AWS');
   ```

2. **Test basic operations:**
   - User profile creation
   - Project data storage
   - Bulk defects storage

## Step 7: Monitor Usage

- **AWS Console** → DynamoDB → Tables → Monitor
- **CloudWatch** → Metrics → DynamoDB
- **Billing** → Check free tier usage

## Migration Checklist

- [ ] AWS account created
- [ ] IAM user with DynamoDB access
- [ ] DynamoDB tables created
- [ ] Environment variables set
- [ ] AWS SDK installed
- [ ] Feature flag enabled
- [ ] Basic operations tested
- [ ] Usage monitoring set up

## Cost Estimation

For a small app like yours:
- **Storage**: ~1-5 GB (well within 25 GB free)
- **Reads**: ~10,000/month (well within 25 RCU)
- **Writes**: ~5,000/month (well within 25 WCU)

**Total cost: $0/month** (within free tier)

## Next Steps

1. **Implement DynamoDB operations** in `DatabaseService`
2. **Test all database operations**
3. **Migrate existing data** from Supabase
4. **Update all components** to use `DatabaseService`
5. **Monitor performance** and costs

## Troubleshooting

- **Access Denied**: Check IAM permissions
- **Table not found**: Verify table names and region
- **High costs**: Check CloudWatch metrics
- **Slow performance**: Consider adding indexes

## Support

- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/) 