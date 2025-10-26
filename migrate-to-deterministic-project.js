import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const dynamoClient = new DynamoDBClient(AWS_CONFIG);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function migrateProject() {
  try {
    const userId = 'timndg@gmail.com';
    const deterministicProjectId = 'proj_6c894ef';
    
    console.log('🔄 Migrating project from "current" to deterministic ID...');
    console.log('User:', userId);
    console.log('Deterministic projectId:', deterministicProjectId);
    
    // 1. Get the "current" project
    const getCurrentCommand = new GetCommand({
      TableName: 'mvp-labeler-projects',
      Key: {
        user_id: userId,
        project_id: 'current'
      }
    });
    
    const currentResult = await docClient.send(getCurrentCommand);
    
    if (currentResult.Item) {
      console.log('✅ Found "current" project with data:', {
        elr: currentResult.Item.formData?.elr,
        structureNo: currentResult.Item.formData?.structureNo,
        date: currentResult.Item.formData?.date
      });
      
      // 2. Copy to deterministic project ID
      const migrateCommand = new PutCommand({
        TableName: 'mvp-labeler-projects',
        Item: {
          ...currentResult.Item,
          project_id: deterministicProjectId,  // Change the project_id
          created_at: currentResult.Item.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });
      
      await docClient.send(migrateCommand);
      console.log('✅ Copied data to deterministic project ID');
      
      // 3. Optionally, delete the "current" project
      const deleteCurrentCommand = new DeleteCommand({
        TableName: 'mvp-labeler-projects',
        Key: {
          user_id: userId,
          project_id: 'current'
        }
      });
      
      await docClient.send(deleteCurrentCommand);
      console.log('✅ Deleted old "current" project');
      
      console.log('\n✅ Migration complete!');
      console.log('Now AWS will use project_id="proj_6c894ef" (matches localStorage)');
    } else {
      console.log('⚠️ No "current" project found to migrate');
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

migrateProject();

