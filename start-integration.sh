#!/bin/bash

echo "🚀 Starting Lambda Integration Test Environment"
echo "=============================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "📝 Please create .env file with your AWS credentials:"
    echo "   AWS_ACCESS_KEY_ID=your_access_key"
    echo "   AWS_SECRET_ACCESS_KEY=your_secret_key"
    echo ""
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install

# Start both servers
echo "🔧 Starting servers..."
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""

# Run both servers concurrently
npm run dev:full 