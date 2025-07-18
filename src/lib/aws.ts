import { Amplify } from 'aws-amplify';

// AWS Amplify Configuration
// This will be configured when we add services via Amplify CLI
const awsConfig = {
  Auth: {
    region: 'eu-west-2', // Your configured region
    userPoolId: process.env.VITE_AWS_USER_POOL_ID,
    userPoolWebClientId: process.env.VITE_AWS_USER_POOL_WEB_CLIENT_ID,
  },
  Storage: {
    AWSS3: {
      bucket: process.env.VITE_AWS_S3_BUCKET,
      region: 'eu-west-2',
    },
  },
  API: {
    GraphQL: {
      endpoint: process.env.VITE_AWS_GRAPHQL_ENDPOINT,
      region: 'eu-west-2',
      defaultAuthMode: 'userPool',
    },
  },
};

// Initialize Amplify with configuration
Amplify.configure(awsConfig);

export default awsConfig; 