#!/usr/bin/env node

/**
 * Test Script for Bulk Defect and Reference Document Functionality
 * 
 * This script helps verify that the bulk defect and reference document
 * functionality works as intended by checking key components and APIs.
 */

import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3001';

// Test utilities
const test = {
  passed: 0,
  failed: 0,
  total: 0,
  
  assert(condition, message) {
    this.total++;
    if (condition) {
      this.passed++;
      console.log(`✅ ${message}`);
    } else {
      this.failed++;
      console.log(`❌ ${message}`);
    }
  },
  
  summary() {
    console.log('\n' + '='.repeat(50));
    console.log(`Test Summary: ${this.passed}/${this.total} passed`);
    if (this.failed > 0) {
      console.log(`❌ ${this.failed} tests failed`);
    } else {
      console.log('🎉 All tests passed!');
    }
    console.log('='.repeat(50));
  }
};

// HTTP request utility
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Test functions
async function testFrontendAvailability() {
  console.log('\n🔍 Testing Frontend Availability...');
  
  try {
    const response = await makeRequest(FRONTEND_URL);
    test.assert(response.statusCode === 200, 'Frontend server is running');
    test.assert(response.data.includes('<!DOCTYPE html>'), 'Frontend returns HTML');
  } catch (error) {
    test.assert(false, `Frontend server error: ${error.message}`);
  }
}

async function testBackendAvailability() {
  console.log('\n🔍 Testing Backend Availability...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`);
    test.assert(response.statusCode === 200, 'Backend server is running');
  } catch (error) {
    test.assert(false, `Backend server error: ${error.message}`);
  }
}

async function testDownloadAPI() {
  console.log('\n🔍 Testing Download API...');
  
  try {
    const testPayload = {
      selectedImages: [],
      formData: {
        elr: 'TEST',
        structureNo: '001',
        date: '2025-01-01'
      },
      mode: 'bulk'
    };
    
    const response = await makeRequest(`${BACKEND_URL}/api/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    // Should return an error for empty images, but API should be reachable
    test.assert(response.statusCode === 400 || response.statusCode === 200, 'Download API is accessible');
  } catch (error) {
    test.assert(false, `Download API error: ${error.message}`);
  }
}

async function testAWSServices() {
  console.log('\n🔍 Testing AWS Service Configuration...');
  
  const awsFiles = [
    'src/lib/aws.ts',
    'src/lib/dynamodb.ts',
    'lambda-package/index.js'
  ];
  
  awsFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    test.assert(exists, `AWS configuration file exists: ${file}`);
  });
}

async function testComponentFiles() {
  console.log('\n🔍 Testing Component Files...');
  
  const componentFiles = [
    'src/components/BulkTextInput.tsx',
    'src/components/DefectTile.tsx',
    'src/components/PDFViewer/PDFViewer.tsx',
    'src/store/metadataStore.ts',
    'src/hooks/useBulkValidation.ts'
  ];
  
  componentFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    test.assert(exists, `Component file exists: ${file}`);
  });
}

async function testPackageDependencies() {
  console.log('\n🔍 Testing Package Dependencies...');
  
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Check for required dependencies
    const requiredDeps = [
      'react',
      'zustand',
      'react-pdf',
      'jszip',
      '@aws-sdk/client-s3'
    ];
    
    requiredDeps.forEach(dep => {
      const hasDep = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep];
      test.assert(hasDep, `Required dependency exists: ${dep}`);
    });
    
  } catch (error) {
    test.assert(false, `Package.json error: ${error.message}`);
  }
}

async function testEnvironmentVariables() {
  console.log('\n🔍 Testing Environment Configuration...');
  
  // Check if environment files exist
  const envFiles = [
    '.env',
    'env.example'
  ];
  
  envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    test.assert(exists, `Environment file exists: ${file}`);
  });
}

async function testLambdaConfiguration() {
  console.log('\n🔍 Testing Lambda Configuration...');
  
  const lambdaFiles = [
    'lambda-package/index.js',
    'lambda-package/package.json',
    'lambda-package/simple-lambda/index.js'
  ];
  
  lambdaFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    const exists = fs.existsSync(filePath);
    test.assert(exists, `Lambda file exists: ${file}`);
  });
}

// Main test execution
async function runTests() {
  console.log('🚀 Starting Bulk Defect and Reference Document Tests...\n');
  
  await testFrontendAvailability();
  await testBackendAvailability();
  await testDownloadAPI();
  await testAWSServices();
  await testComponentFiles();
  await testPackageDependencies();
  await testEnvironmentVariables();
  await testLambdaConfiguration();
  
  test.summary();
  
  // Provide next steps
  console.log('\n📋 Next Steps for Manual Testing:');
  console.log('1. Open http://localhost:5173 in your browser');
  console.log('2. Navigate to the bulk defects tab');
  console.log('3. Test adding, editing, and deleting defects');
  console.log('4. Test file selection and drag-and-drop');
  console.log('5. Test bulk text import functionality');
  console.log('6. Navigate to the PDF viewer tab');
  console.log('7. Test PDF upload, navigation, and zoom');
  console.log('8. Test dual PDF viewer functionality');
  console.log('9. Verify data persistence across page refreshes');
  console.log('10. Test download functionality with bulk defects');
  
  console.log('\n📖 See tests/bulk-defect-reference-test-plan.md for detailed test cases');
}

// Run tests
runTests().catch(console.error); 