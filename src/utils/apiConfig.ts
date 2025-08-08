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
  
  if (isDevelopment) {
    // Use relative URL for development (works with proxy)
    const localUrl = '/api/download';
    console.log('  - Using relative URL for development:', localUrl);
    return localUrl;
  } else {
    // Use HTTP API Gateway for production (Amplify) - EU West 2 for better performance
    const prodUrl = 'https://ht1uumxmwh.execute-api.eu-west-2.amazonaws.com/download';
    console.log('  - Using production URL (EU West 2):', prodUrl);
    return prodUrl;
  }
};

// Helper function to get the full API URL
export const getFullApiUrl = () => {
  const endpoint = getApiEndpoint();
  
  // If it's a relative URL, it will be handled by the proxy in development
  if (endpoint.startsWith('/')) {
    return endpoint;
  }
  
  // If it's an absolute URL, return as is
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