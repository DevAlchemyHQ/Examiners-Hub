# Lambda Integration Setup

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Lambda Function Name
LAMBDA_FUNCTION_NAME=your-actual-lambda-function-name

# S3 Bucket
S3_BUCKET_NAME=your-bucket-name

# DynamoDB Table
DYNAMODB_TABLE_NAME=your-table-name
```

### 3. Update Lambda Function Name

In `src/api/download.js`, update the function name:

```javascript
FunctionName: process.env.LAMBDA_FUNCTION_NAME ||
  "your-actual-lambda-function-name";
```

### 4. Test Lambda Connection

```bash
node test-lambda-connection.js
```

### 5. Start Development Server

```bash
# Start both React app and Express server
npm run dev:full

# Or start them separately:
npm run dev      # React app (port 5173)
npm run server   # Express server (port 3001)
```

## 📁 File Structure

```
├── server.js                    # Express server
├── src/
│   ├── api/
│   │   └── download.js         # API route for Lambda calls
│   └── components/
│       └── DownloadButton.tsx  # Updated to call Lambda
├── test-lambda-connection.js   # Test script
└── LAMBDA_SETUP.md            # This file
```

## 🔧 How It Works

### Frontend Flow:

1. User clicks "Download Package"
2. `DownloadButton.tsx` calls `/api/download`
3. Express server proxies request to Lambda
4. Lambda generates ZIP and returns download URL
5. Frontend opens download URL

### API Flow:

1. Express receives POST to `/api/download`
2. Calls AWS Lambda with image data
3. Lambda processes images and creates ZIP
4. Returns download URL or ZIP data
5. Express forwards response to frontend

## 🐛 Troubleshooting

### Common Issues:

1. **Lambda Function Not Found**

   - Check function name in `.env`
   - Verify function exists in AWS Console

2. **AWS Credentials Error**

   - Verify AWS credentials in `.env`
   - Check IAM permissions for Lambda invoke

3. **CORS Errors**

   - Express server handles CORS
   - Vite proxy configured for development

4. **Port Conflicts**
   - React app: port 5173
   - Express server: port 3001
   - Update vite.config.ts if needed

## 🎯 Next Steps

1. **Update Lambda Function** - Add actual download logic
2. **Add Error Handling** - Better error messages
3. **Add Loading States** - Show progress during download
4. **Add Authentication** - Secure API endpoints
5. **Deploy to Production** - Set up production server

## 💡 Tips

- Use `npm run dev:full` for development
- Check browser console for API errors
- Use `test-lambda-connection.js` to verify setup
- Monitor Lambda logs in AWS Console
