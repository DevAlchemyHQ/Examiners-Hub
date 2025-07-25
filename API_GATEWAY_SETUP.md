# HTTP API Gateway Setup Guide for MVP Labeler

## Overview

This guide will help you set up an **HTTP API Gateway** (recommended over REST API) to expose your `download-generator` Lambda function so it can be accessed from your Amplify-hosted frontend.

## Why HTTP API?

- ✅ **Simpler setup** - Less configuration needed
- ✅ **Better CORS handling** - Built-in CORS support
- ✅ **Lower latency** - Faster response times
- ✅ **Cost effective** - $1.00 per million requests vs $3.50 for REST
- ✅ **Auto-generated SDKs** - Better developer experience

## Prerequisites

- AWS Console access
- Your Lambda function `download-generator` is already working (confirmed ✅)
- Your AWS credentials are configured

## Step-by-Step Setup

### Step 1: Create HTTP API

1. Go to AWS Console → API Gateway
2. Click "Create API"
3. Choose "HTTP API" → "Build"
4. Configure:
   - **API name**: `mvp-labeler-download-api`
   - **Description**: `HTTP API for MVP Labeler download functionality`
5. Click "Next"

### Step 2: Add Integration

1. Click "Add integration"
2. Configure:
   - **Integration type**: Lambda
   - **Lambda function**: `download-generator`
   - **API name**: `mvp-labeler-download-api`
3. Click "Next"

### Step 3: Configure Routes

1. Click "Add route"
2. Configure:
   - **Method**: POST
   - **Resource path**: `/download`
   - **Integration**: `download-generator`
3. Click "Next"

### Step 4: Configure Stages

1. **Stage name**: `$default` (or `prod`)
2. **Auto-deploy**: ✅ Check this box
3. Click "Next"

### Step 5: Review and Create

1. Review your configuration
2. Click "Create"

### Step 6: Get Your API URL

After creation, you'll get a URL like:

```
https://[API_ID].execute-api.eu-west-2.amazonaws.com/download
```

### Step 7: Update Frontend Configuration

Once you have your API URL, update the `src/utils/apiConfig.ts` file:

```typescript
// Replace YOUR_API_ID with your actual API ID
return "https://YOUR_API_ID.execute-api.eu-west-2.amazonaws.com/download";
```

## Testing the Setup

### Test 1: Direct API Call

You can test the API directly using curl or Postman:

```bash
curl -X POST https://[API_ID].execute-api.eu-west-2.amazonaws.com/download \
  -H "Content-Type: application/json" \
  -d '{
    "selectedImages": [],
    "formData": {"date": "2025-01-25", "elr": "TEST", "structureNo": "TEST"},
    "mode": "images"
  }'
```

### Test 2: Frontend Integration

1. Update the API URL in `src/utils/apiConfig.ts`
2. Deploy your frontend to Amplify
3. Test the download functionality on your Amplify site

## Troubleshooting

### Common Issues:

1. **CORS Errors**: HTTP API has built-in CORS support, but you can configure it in the console
2. **Lambda Permission Errors**: The setup should automatically add permissions
3. **API Not Found**: Double-check the API URL and deployment stage

### Verification Commands:

```bash
# Test Lambda function directly
node test-lambda-find.js

# Test HTTP API (after setup)
curl -X POST https://[API_ID].execute-api.eu-west-2.amazonaws.com/download \
  -H "Content-Type: application/json" \
  -d '{"selectedImages":[],"formData":{"date":"2025-01-25","elr":"TEST","structureNo":"TEST"},"mode":"images"}'
```

## Cost Comparison

| Service           | HTTP API          | REST API          |
| ----------------- | ----------------- | ----------------- |
| **API calls**     | $1.00 per million | $3.50 per million |
| **Data transfer** | $0.09 per GB      | $0.09 per GB      |
| **Setup time**    | 5 minutes         | 15 minutes        |
| **CORS**          | Built-in          | Manual setup      |

## Security Considerations

1. **API Key**: Consider adding API key authentication for production
2. **Rate Limiting**: Configure rate limiting in API Gateway
3. **CORS**: HTTP API has better CORS handling out of the box

## Next Steps

1. Complete the HTTP API setup using the steps above
2. Update the API URL in `src/utils/apiConfig.ts`
3. Deploy your frontend to Amplify
4. Test the download functionality

## Support

If you encounter any issues:

1. Check the AWS CloudWatch logs for your Lambda function
2. Check the API Gateway logs
3. Verify the API URL is correct in your frontend configuration

---

**Your Lambda function is working perfectly!** ✅

- Function name: `download-generator`
- Region: `eu-west-2`
- Status: Active and responding

**HTTP API is the better choice** - it's faster, cheaper, and easier to set up than REST API.

Once you complete the HTTP API setup, your Amplify frontend will be able to call the Lambda function directly without needing the local Express server.
