import { DynamoDBClient, UpdateTableCommand } from '@aws-sdk/client-dynamodb';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const dynamoClient = new DynamoDBClient(AWS_CONFIG);

const tables = [
  'mvp-labeler-profiles',
  'mvp-labeler-projects',
  'mvp-labeler-bulk-defects',
  'mvp-labeler-defect-sets',
  'mvp-labeler-pdf-states',
  'mvp-labeler-feedback',
  'mvp-labeler-selected-images'
];

async function switchToProvisionedCapacity() {
  console.log('💰 Switching DynamoDB tables to PROVISIONED capacity to reduce costs...');
  
  for (const tableName of tables) {
    try {
      console.log(`\n🔄 Updating table: ${tableName}`);
      
      const command = new UpdateTableCommand({
        TableName: tableName,
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
          ReadCapacityUnits: 1,  // Minimum for free tier
          WriteCapacityUnits: 1   // Minimum for free tier
        }
      });
      
      await dynamoClient.send(command);
      console.log(`✅ Successfully switched ${tableName} to PROVISIONED capacity`);
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        console.log(`⚠️ Table ${tableName} does not exist`);
      } else {
        console.error(`❌ Error updating ${tableName}:`, error.message);
      }
    }
  }
  
  console.log('\n🎉 All tables updated to PROVISIONED capacity!');
  console.log('💡 This should significantly reduce your DynamoDB costs');
}

// Run the optimization
switchToProvisionedCapacity().catch(console.error); 