// API Configuration for different environments
export const getApiEndpoint = () => {
  // Check if we're in development (localhost)
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '5173' ||
                       window.location.port === '5174' ||
                       window.location.port === '5175' ||
                       window.location.port === '5176';
  
  console.log('🔧 API Config Debug:');
  console.log('  - Hostname:', window.location.hostname);
  console.log('  - Port:', window.location.port);
  console.log('  - Is Development:', isDevelopment);
  console.log('  - Current time:', new Date().toISOString());
  console.log('  - User Agent:', navigator.userAgent);
  
  if (isDevelopment) {
    // Use local Express server for development (port 3001)
    const localUrl = 'http://localhost:3001/api/download';
    console.log('  - Using local URL:', localUrl);
    return localUrl;
  } else {
    // Use HTTP API Gateway for production (Amplify)
    const prodUrl = 'https://z2p4tzd5u3.execute-api.us-east-1.amazonaws.com/download';
    console.log('  - Using production URL:', prodUrl);
    return prodUrl;
  }
};

// Helper function to get the full API URL
export const getFullApiUrl = () => {
  const endpoint = getApiEndpoint();
  
  // Add cache-busting timestamp for development
  if (endpoint.includes('localhost')) {
    const timestamp = Date.now();
    const version = 'v1.1.1'; // Force cache bust
    const random = Math.random().toString(36).substring(7);
    console.log('  - Adding cache-bust timestamp:', timestamp);
    console.log('  - Adding version:', version);
    console.log('  - Adding random:', random);
    return `${endpoint}?t=${timestamp}&v=${version}&r=${random}`;
  }
  
  // Return the full URL (either localhost:3001 or production)
  return endpoint;
};

// Environment detection
export const isProduction = () => {
  return !(window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.port === '5173' ||
           window.location.port === '5174' ||
           window.location.port === '5175' ||
           window.location.port === '5176');
};

export const isDevelopment = () => {
  return !isProduction();
}; 