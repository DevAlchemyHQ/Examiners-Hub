# AWS Console Guide - View Your Migrated Data

## 🔍 How to Access Your AWS Services

### **1. AWS DynamoDB - View Database Data**

**Step-by-step:**

1. **Go to AWS Console** → DynamoDB
2. **Click "Tables"** in the left sidebar
3. **Find your tables:**
   - `profiles` - User profiles
   - `projects` - User projects
   - `bulk_defects` - Defect data
   - `defect_sets` - Defect collections
   - `user_pdfs` - PDF files
   - `user_pdf_state` - PDF state
   - `feedback` - User feedback

**To view data:**

1. **Click on a table name** (e.g., `profiles`)
2. **Click "Explore table data"**
3. **You'll see your migrated users:**
   - Kevin (timsdng@gmail.com)
   - Test User (test@example.com)
   - Unknown User (newuser@example.com)
   - michael (test@test.com)

### **2. AWS S3 - View File Storage**

**Step-by-step:**

1. **Go to AWS Console** → S3
2. **Find bucket:** `mvp-labeler-storage`
3. **Click on the bucket name**
4. **Browse folders:**
   - `migrated/` - Files migrated from Supabase
   - New uploads will appear in root

### **3. AWS Cognito - View User Authentication**

**Step-by-step:**

1. **Go to AWS Console** → Cognito
2. **Click "User pools"**
3. **Find:** `mvp-labeler-users`
4. **Click on the user pool**
5. **Click "Users"** to see registered users
6. **Click "App integration"** to see client settings

### **4. AWS IAM - View Permissions**

**Step-by-step:**

1. **Go to AWS Console** → IAM
2. **Click "Users"**
3. **Find:** `Exametry_migrate`
4. **Click on the user**
5. **See attached policies:**
   - `AmazonDynamoDBFullAccess`
   - `AmazonS3FullAccess`
   - `AmazonCognitoPowerUser`

## 📊 Quick Data Overview

### **Your Migrated Data:**

- **4 User Profiles** in DynamoDB
- **0 Projects** (table was empty)
- **0 Bulk Defects** (table was empty)
- **0 Defect Sets** (table was empty)
- **0 Storage Files** (no files in Supabase storage)

### **AWS Services Active:**

- ✅ **DynamoDB**: Database operations
- ✅ **S3**: File storage
- ✅ **Cognito**: User authentication

## 🔗 Direct Links

**Replace `YOUR_REGION` with `eu-west-2`:**

- **DynamoDB Tables:** https://console.aws.amazon.com/dynamodbv2/home?region=eu-west-2#tables
- **S3 Bucket:** https://console.aws.amazon.com/s3/buckets/mvp-labeler-storage?region=eu-west-2
- **Cognito User Pool:** https://console.aws.amazon.com/cognito/users?region=eu-west-2
- **IAM User:** https://console.aws.amazon.com/iam/home#/users/Exametry_migrate

## 💰 Cost Monitoring

**Check your AWS costs:**

1. **Go to AWS Console** → Billing
2. **Click "Bills"** to see monthly charges
3. **Current status:** All services within free tier limits

## 🚀 Next Steps

1. **Test the app** with AWS authentication
2. **Upload files** to see them in S3
3. **Create projects** to see them in DynamoDB
4. **Monitor usage** to stay within free tier
