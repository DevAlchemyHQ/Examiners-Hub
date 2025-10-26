import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const dynamoClient = new DynamoDBClient(AWS_CONFIG);
const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function queryUserProjects() {
  try {
    const userId = 'timndg@gmail.com';
    
    console.log('🔍 Querying all projects for user:', userId);
    
    const command = new QueryCommand({
      TableName: 'mvp-labeler-projects',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });
    
    const result = await docClient.send(command);
    
    console.log('\n📊 Found', result.Items?.length || 0, 'projects:');
    console.log('=============================');
    
    if (result.Items && result.Items.length > 0) {
      result.Items.forEach((item, index) => {
        console.log(`\nProject ${index + 1}:`);
        console.log('  project_id:', item.project_id);
        console.log('  created_at:', item.created_at);
        console.log('  updated_at:', item.updated_at);
        
        if (item.formData) {
          console.log('  formData:', {
            elr: item.formData.elr,
            structureNo: item.formData.structureNo,
            date: item.formData.date
          });
        }
        
        if (item.sessionState?.lastActiveTime) {
          console.log('  lastActiveTime:', item.sessionState.lastActiveTime);
        }
        
        console.log('  ---');
      });
    } else {
      console.log('❌ No projects found');
    }
    
  } catch (error) {
    console.error('❌ Error querying projects:', error);
  }
}

queryUserProjects();

