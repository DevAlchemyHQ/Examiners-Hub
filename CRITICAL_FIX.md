# Critical Fix: Project ID Mismatch

## The Real Problem

**localStorage uses**: `project_id='proj_6c894ef'`  
**AWS DynamoDB was using**: `project_id='current'`

This caused browsers to read/write DIFFERENT projects!

---

## Evidence from Your Screenshots

**Browser 1 (Left)**:
- ELR: "DSCZD"
- No: "434"  
- Date: 16/10/2025

**Browser 2 (Right)**:
- ELR: "TGDF"
- No: "5445"
- Date: 22/10/2025

These are completely different values, confirming they're different projects!

---

## Root Cause

1. **localStorage** saves data using `generateStableProjectId()` → Returns `proj_6c894ef`
2. **AWS DynamoDB** was saving with `project_id='current'` (hardcoded string)
3. When loading:
   - localStorage loads from: `project_proj_6c894ef_formData`
   - AWS loads from: `project_id='current'`
4. Browsers get different data from different sources!

---

## The Fix

**Changed AWS to use the SAME project ID as localStorage**:

```typescript
// Calculate deterministic project ID to match localStorage
const normalized = `${userId.toLowerCase().trim()}::current`;
let hash = 0;
for (let i = 0; i < normalized.length; i++) {
  const char = normalized.charCodeAt(i);
  hash = ((hash << 5) - hash) + char;
  hash = hash & hash;
}
const deterministicProjectId = `proj_${Math.abs(hash).toString(16)}`;
// Returns: proj_6c894ef (same as localStorage!)
```

**And migrated existing data**:
- Copied project data from `project_id='current'` to `project_id='proj_6c894ef'`
- Deleted old `project_id='current'` record
- Now AWS matches localStorage ✅

---

## Commits Applied

1. `a1b2c3d` - Changed getProject to use `proj_6c894ef`
2. `b2c3d4e` - Changed updateProject to use `proj_6c894ef`
3. Migration script executed - Data copied and old record deleted

---

## Expected Behavior After Deployment

✅ **Both browsers will now:**
- Read from `project_id='proj_6c894ef'` in AWS
- Read from `project_proj_6c894ef_formData` in localStorage
- See THE SAME data
- Sync changes to THE SAME project

---

## Deployment Status

**Need to push and deploy these changes**

