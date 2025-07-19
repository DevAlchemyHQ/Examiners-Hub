import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const dynamoClient = new DynamoDBClient(AWS_CONFIG);

const tables = [
  {
    TableName: 'mvp-labeler-profiles',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-projects',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'project_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'project_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-bulk-defects',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'defect_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'defect_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-defect-sets',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'set_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'set_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-pdf-states',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'pdf_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'pdf_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-feedback',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'feedback_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'feedback_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'mvp-labeler-selected-images',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'selection_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'selection_id', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

async function createTables() {
  console.log('🚀 Creating DynamoDB tables...');
  
  for (const table of tables) {
    try {
      console.log(`Creating table: ${table.TableName}`);
      const command = new CreateTableCommand(table);
      await dynamoClient.send(command);
      console.log(`✅ Created table: ${table.TableName}`);
    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`⚠️ Table already exists: ${table.TableName}`);
      } else {
        console.error(`❌ Error creating table ${table.TableName}:`, error);
      }
    }
  }
  
  console.log('🎉 DynamoDB tables setup complete!');
}

createTables().catch(console.error); 