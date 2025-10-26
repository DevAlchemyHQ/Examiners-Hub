# Root Cause Analysis: Inconsistent Data Across Browsers

## Problem Statement

You have three browsers with **different ELR, Structure No, and Date values** after making changes in each. Changes in one browser don't appear in the others, even after refresh.

---

## 🔍 Root Cause: Flawed DynamoDB Query Logic

### The Table Structure

```
Table: mvp-labeler-projects
Primary Key:
  - Partition Key: user_id
  - Sort Key: project_id
```

### The Problematic Query (Line 1005-1013 in services.ts)

```typescript
const queryCommand = new QueryCommand({
  TableName: "mvp-labeler-projects",
  KeyConditionExpression: "user_id = :userId", // ❌ Missing project_id!
  ExpressionAttributeValues: {
    ":userId": userId,
  },
  ScanIndexForward: false, // Sort by sort key descending
  Limit: 1, // Only get the most recent project
});
```

### Why This Fails

1. **No Sort Key in Query**: The query only uses `user_id`, not `project_id`
2. **Multiple Projects Exist**: Each time data is saved, if no project exists, a NEW project with timestamp is created
3. **Non-Deterministic Order**: Without querying the sort key, DynamoDB returns results in unpredictable order
4. **Different Browsers Get Different Projects**: Each browser might load a different project as the "most recent"

---

## 🔴 Specific Issues

### Issue 1: New Project Creation Creates Multiple Projects

**Location**: `src/lib/services.ts` line 1093-1112

```typescript
// If no existing project
const timestamp = Date.now().toString(); // ❌ Creates new project every time
const project_id = timestamp; // ❌ Different ID each time!

const command = new PutCommand({
  TableName: "mvp-labeler-projects",
  Item: {
    user_id: userId,
    project_id: timestamp, // ❌ Creates a NEW project
    ...smallData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});
```

**Problem**: If three browsers simultaneously save when no project exists, THREE different projects are created!

### Issue 2: Query Returns Unpredictable "Most Recent" Project

**Location**: `src/lib/services.ts` line 1005-1019

```typescript
KeyConditionExpression: 'user_id = :userId',  // ❌ Only partition key
// Missing: 'AND project_id = :specificId'

ScanIndexForward: false,  // This only works if sort key is in KeyConditionExpression
Limit: 1
```

**Problem**: With multiple projects, `ScanIndexForward: false` doesn't guarantee which project you get because the sort key isn't in the condition.

### Issue 3: Data Merging Doesn't Help

**Location**: `src/lib/services.ts` line 1077-1080

```typescript
const mergedProjectData = {
  ...existingProject, // This has OLD formData
  ...smallData, // This has NEW formData (only in sessionState)
  sessionState: mergedSessionState,
  updated_at: new Date().toISOString(),
};
```

**Problem**: If `smallData` doesn't include `formData` at the root level (it's only in sessionState), the old formData persists.

---

## 💡 The Solution

We need to ensure all browsers read and write to the **SAME project record**. Two approaches:

### Approach 1: Use Deterministic Project ID (Recommended)

Instead of creating timestamp-based IDs, use a **deterministic project ID** that's the same for "current" project:

```typescript
const PROJECT_ID_CURRENT = "current";  // Fixed, always the same

// When creating:
project_id: PROJECT_ID_CURRENT  // Not a timestamp!

// When querying:
KeyConditionExpression: 'user_id = :userId AND project_id = :projectId',
ExpressionAttributeValues: {
  ':userId': userId,
  ':projectId': PROJECT_ID_CURRENT  // Query specific project
}
```

### Approach 2: Always Update by Specific Project ID

Instead of creating new projects, always update the existing "current" project:

```typescript
// In updateProject:
if (projectId === "current") {
  // Get existing project
  const getProjectResult = await this.getProject(userId, "current");

  if (getProjectResult.project) {
    // Use the EXISTING project_id (don't create new!)
    const actualProjectId = getProjectResult.project.project_id;

    // Update THIS specific project
    const command = new PutCommand({
      TableName: "mvp-labeler-projects",
      Key: {
        user_id: userId,
        project_id: actualProjectId, // ✅ Update specific project
      },
      UpdateExpression: "SET #data = :data, updated_at = :updated",
      ExpressionAttributeNames: { "#data": "projectData" },
      ExpressionAttributeValues: {
        ":data": projectData,
        ":updated": new Date().toISOString(),
      },
    });

    await docClient.send(command);
  }
}
```

---

## 🎯 Recommended Fix

### Step 1: Change Query to Use Specific Project ID

Update `getProject()` to query by both keys:

```typescript
static async getProject(userId: string, projectId: string) {
  const queryCommand = new QueryCommand({
    TableName: 'mvp-labeler-projects',
    KeyConditionExpression: 'user_id = :userId AND project_id = :projectId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':projectId': 'current'  // Always query "current" project
    }
  });

  const result = await docClient.send(queryCommand);
  return { project: result.Items[0] || null, error: null };
}
```

### Step 2: Always Create Project with ID "current"

Instead of timestamps, use fixed ID:

```typescript
const command = new PutCommand({
  TableName: "mvp-labeler-projects",
  Item: {
    user_id: userId,
    project_id: "current", // ✅ Always the same ID
    ...smallData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
});
```

### Step 3: Update by Both Keys

Use UpdateCommand with both keys:

```typescript
const updateCommand = new UpdateCommand({
  TableName: "mvp-labeler-projects",
  Key: {
    user_id: userId,
    project_id: "current", // ✅ Both keys required
  },
  UpdateExpression: "SET #data = :data, #updated = :updated",
  ExpressionAttributeNames: {
    "#data": "projectData",
    "#updated": "updated_at",
  },
  ExpressionAttributeValues: {
    ":data": projectData,
    ":updated": new Date().toISOString(),
  },
});
```

---

## 📊 Current vs Fixed Behavior

### Current (Broken):

```
Browser 1: Creates project_id = "1729690000"
Browser 2: Creates project_id = "1729690001"
Browser 3: Creates project_id = "1729690002"

Query result: Unpredictable which one is "most recent"
Result: Each browser sees different data
```

### Fixed:

```
All Browsers: Use project_id = "current"

Query result: Always same project
Result: All browsers see same data ✅
```

---

## 🔧 Implementation Required

I need to update:

1. `src/lib/services.ts` - `getProject()` method
2. `src/lib/services.ts` - `updateProject()` method
3. Ensure "current" is used consistently

This will ensure all browsers read/write the SAME project record.
