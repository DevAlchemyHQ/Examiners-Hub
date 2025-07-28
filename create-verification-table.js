import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });

async function createVerificationTable() {
  const params = {
    TableName: 'mvp-labeler-verification-codes',
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },  // Partition key
      { AttributeName: 'email', KeyType: 'RANGE' }  // Sort key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
      { AttributeName: 'type', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'email-type-index',
        KeySchema: [
          { AttributeName: 'email', KeyType: 'HASH' },
          { AttributeName: 'type', KeyType: 'RANGE' }
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ]
  };

  try {
    const command = new CreateTableCommand(params);
    const response = await client.send(command);
    console.log('✅ Verification codes table created successfully:', response);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Table already exists');
    } else {
      console.error('❌ Error creating table:', error);
    }
  }
}

createVerificationTable(); 