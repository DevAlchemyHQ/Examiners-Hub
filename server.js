import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import downloadRouter from './src/api/download.js';
import { PDFLoader } from 'langchain/document_loaders';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { VectorStore } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { OpenAI } from 'langchain/llms';
import { LangChain } from 'langchain/core';

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

// LangChain Chatbot endpoints
app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    // Check pre-defined responses first
    const preDefined = checkPreDefinedResponses(message);
    if (preDefined) {
      return res.json({ response: preDefined, source: 'pre-defined' });
    }
    
    // Use LangChain for complex queries
    const response = await langchainChain.call({ 
      query: message,
      context: context 
    });
    
    res.json({ response: response.text, source: 'ai' });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

app.post('/api/upload-document', upload.single('pdf'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Process PDF with LangChain
    const loader = new PDFLoader(file.path);
    const docs = await loader.load();
    
    // Split documents
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await textSplitter.splitDocuments(docs);
    
    // Add to vector store
    await vectorStore.addDocuments(splitDocs);
    
    res.json({ success: true, documents: splitDocs.length });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
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