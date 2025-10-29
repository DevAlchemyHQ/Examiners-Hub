// Script to check what formData is actually stored in AWS DynamoDB
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const AWS_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'AKIA5JMSUOLD2BUTQRRF',
    secretAccessKey: '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'
  }
};

const client = new DynamoDBClient(AWS_CONFIG);
const docClient = DynamoDBDocumentClient.from(client);

async function checkFormData() {
  const userId = 'timndg@gmail.com';
  const projectId = 'proj_6c894ef'; // Deterministic project ID
  
  try {
    console.log(`🔍 Checking AWS DynamoDB for user: ${userId}, project: ${projectId}`);
    
    const command = new GetCommand({
      TableName: 'mvp-labeler-projects',
      Key: {
        user_id: userId,
        project_id: projectId
      }
    });
    
    const result = await docClient.send(command);
    
    if (result.Item) {
      console.log('\n✅ Project found in AWS:');
      console.log('📋 Root formData:', JSON.stringify(result.Item.formData, null, 2));
      console.log('📋 SessionState formData:', JSON.stringify(result.Item.sessionState?.formData, null, 2));
      console.log('📋 lastActiveTime:', result.Item.sessionState?.lastActiveTime);
      console.log('📋 updated_at:', result.Item.updated_at);
      
      // Check for values
      const rootFormData = result.Item.formData || {};
      const sessionFormData = result.Item.sessionState?.formData || {};
      const rootHasValues = !!(rootFormData.elr?.trim()) || !!(rootFormData.structureNo?.trim());
      const sessionHasValues = !!(sessionFormData.elr?.trim()) || !!(sessionFormData.structureNo?.trim());
      
      console.log('\n🔍 Value Check:');
      console.log('  Root formData has values:', rootHasValues);
      console.log('  Session formData has values:', sessionHasValues);
      console.log('  Root elr:', rootFormData.elr);
      console.log('  Root structureNo:', rootFormData.structureNo);
      console.log('  Session elr:', sessionFormData.elr);
      console.log('  Session structureNo:', sessionFormData.structureNo);
    } else {
      console.log('❌ No project found in AWS');
    }
  } catch (error) {
    console.error('❌ Error checking AWS:', error);
  }
}

checkFormData();
