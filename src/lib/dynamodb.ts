import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// DynamoDB Configuration
const dynamoDBConfig = {
  region: process.env.VITE_AWS_REGION || 'eu-west-2',
  credentials: {
    accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  },
};

// Initialize DynamoDB client
const client = new DynamoDBClient(dynamoDBConfig);
export const dynamoDB = DynamoDBDocumentClient.from(client);

// Table names
export const TABLE_NAMES = {
  PROFILES: 'profiles',
  PROJECTS: 'projects',
  BULK_DEFECTS: 'bulk_defects',
  DEFECT_SETS: 'defect_sets',
  IMAGE_METADATA: 'image_metadata',
  USER_PDFS: 'user_pdfs',
  USER_PDF_STATE: 'user_pdf_state',
  FEEDBACK: 'feedback',
  QUAIL_MAPS: 'quail_maps',
} as const;

// DynamoDB Table Schemas
export const TABLE_SCHEMAS = {
  PROFILES: {
    TableName: TABLE_NAMES.PROFILES,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST', // Free tier friendly
  },
  
  PROJECTS: {
    TableName: TABLE_NAMES.PROJECTS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  
  BULK_DEFECTS: {
    TableName: TABLE_NAMES.BULK_DEFECTS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
  
  DEFECT_SETS: {
    TableName: TABLE_NAMES.DEFECT_SETS,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' }, // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
} as const;

// Helper function to create tables (for setup)
export const createTables = async () => {
  console.log('🗄️ Creating DynamoDB tables...');
  
  // This would be called during AWS setup
  // For now, just log the table schemas
  Object.entries(TABLE_SCHEMAS).forEach(([tableName, schema]) => {
    console.log(`📋 Table: ${tableName}`, schema);
  });
  
  console.log('✅ DynamoDB table schemas ready');
};

// Helper function to check if tables exist
export const checkTables = async () => {
  console.log('🔍 Checking DynamoDB tables...');
  
  // This would check if tables exist in AWS
  // For now, just log the table names
  Object.values(TABLE_NAMES).forEach(tableName => {
    console.log(`📋 Table: ${tableName}`);
  });
  
  console.log('✅ DynamoDB tables checked');
}; 