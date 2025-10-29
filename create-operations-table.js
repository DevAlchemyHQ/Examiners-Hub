/**
 * Create DynamoDB Table for Operation Queue System
 * 
 * Run this script to create the mvp-labeler-operations table
 * 
 * Usage: node create-operations-table.js
 */

import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const docClient = DynamoDBDocumentClient.from(client);

async function createOperationsTable() {
  try {
    console.log('🔧 Creating mvp-labeler-operations table...');

    const command = new CreateTableCommand({
      TableName: 'mvp-labeler-operations',
      AttributeDefinitions: [
        {
          AttributeName: 'user_id',
          AttributeType: 'S', // String
        },
        {
          AttributeName: 'operation_id',
          AttributeType: 'S', // String
        },
        {
          AttributeName: 'timestamp',
          AttributeType: 'N', // Number (for GSI)
        },
      ],
      KeySchema: [
        {
          AttributeName: 'user_id',
          KeyType: 'HASH', // Partition key
        },
        {
          AttributeName: 'operation_id',
          KeyType: 'RANGE', // Sort key
        },
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand pricing (scales automatically)
      // Optional: Add GSI for efficient timestamp queries (Phase 2 optimization)
      GlobalSecondaryIndexes: [
        {
          IndexName: 'timestamp-index',
          KeySchema: [
            {
              AttributeName: 'user_id',
              KeyType: 'HASH',
            },
            {
              AttributeName: 'timestamp',
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL', // Include all attributes
          },
        },
      ],
    });

    const result = await client.send(command);
    console.log('✅ Table created successfully!');
    console.log('📊 Table details:', JSON.stringify(result.TableDescription, null, 2));
    console.log('⏳ Table is being created, status:', result.TableDescription?.TableStatus);
    console.log('');
    console.log('ℹ️  Note: Table creation takes a few minutes. Operations will work once status is ACTIVE.');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('ℹ️  Table already exists - skipping creation');
    } else {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }
}

// Run the script
createOperationsTable()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

