// API Configuration for different environments
export const getApiEndpoint = () => {
  // Check if we're in development (localhost)
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '5173' ||
                       window.location.port === '5174';
  
  if (isDevelopment) {
    // Use local Express server for development
    return '/api/download';
  } else {
    // Use HTTP API Gateway for production (Amplify)
    return 'https://z2p4tzd5u3.execute-api.us-east-1.amazonaws.com/download';
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
           window.location.port === '5174');
};

export const isDevelopment = () => {
  return !isProduction();
}; 