import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRouter from './src/api/download.js';

// Load environment variables
dotenv.config();

// Debug: Check if environment variables are loaded
console.log('🔍 Server Environment Check:');
console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET');
console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api', downloadRouter);

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Download server running' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lambda download server running' });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: error.message || 'Internal server error',
    success: false
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Lambda download server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Download API: http://localhost:${PORT}/api/download`);
}); 