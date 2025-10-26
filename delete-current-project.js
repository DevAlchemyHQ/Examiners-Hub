import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const dynamoClient = new DynamoDBClient(AWS_CONFIG);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function deleteCurrentProject() {
  try {
    const userId = 'timndg@gmail.com';
    
    console.log('🗑️ Deleting old project_id="current" record...');
    
    const deleteCommand = new DeleteCommand({
      TableName: 'mvp-labeler-projects',
      Key: {
        user_id: userId,
        project_id: 'current'
      }
    });
    
    await docClient.send(deleteCommand);
    
    console.log('✅ Deleted project_id="current" successfully');
    console.log('Now only proj_6c894ef exists');
    
  } catch (error) {
    console.error('❌ Error deleting project:', error);
  }
}

deleteCurrentProject();

