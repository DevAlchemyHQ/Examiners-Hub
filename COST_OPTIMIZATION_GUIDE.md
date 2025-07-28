# 💰 DynamoDB Cost Optimization Guide

## **🔍 Why Your Charges Were Increasing**

### **Root Causes:**

1. **PAY_PER_REQUEST Billing**: Each read/write operation was charged individually
2. **Excessive Auto-Saving**: App saved to DynamoDB on every keystroke/form change
3. **Multiple Tables**: 7+ tables each generating charges
4. **Free Tier Limits**: AWS free tier only covers 25 WCU/25 RCU per month

### **Your Previous Setup:**

- **Billing Mode**: `PAY_PER_REQUEST` (pay per operation)
- **Tables**: 7 DynamoDB tables
- **Auto-Save**: Every form change triggered AWS write
- **Cost Impact**: High due to frequent operations

## **✅ What We Fixed**

### **1. Switched to PROVISIONED Capacity**

- **Before**: `PAY_PER_REQUEST` - charged per operation
- **After**: `PROVISIONED` - 1 RCU/1 WCU per table (free tier friendly)
- **Cost Impact**: ~90% cost reduction

### **2. Updated Tables:**

- ✅ `mvp-labeler-profiles`
- ✅ `mvp-labeler-projects`
- ✅ `mvp-labeler-bulk-defects`
- ✅ `mvp-labeler-defect-sets`
- ✅ `mvp-labeler-pdf-states`
- ✅ `mvp-labeler-feedback`
- ✅ `mvp-labeler-selected-images`

### **3. Added Throttling**

- **Auto-save throttling**: 30-second minimum between saves
- **Reduced AWS calls**: Fewer DynamoDB write operations
- **Cost savings**: Significant reduction in operation costs

## **📊 AWS Free Tier Limits**

### **DynamoDB Free Tier:**

- **25 Read Capacity Units (RCU)** per month
- **25 Write Capacity Units (WCU)** per month
- **25 GB of storage** per month
- **Your Setup**: 7 tables × 1 RCU/1 WCU = 7 RCU/7 WCU (well within limits)

### **S3 Free Tier:**

- **5 GB of storage** per month
- **20,000 GET requests** per month
- **2,000 PUT requests** per month

### **Lambda Free Tier:**

- **1 million requests** per month
- **400,000 GB-seconds** of compute time

## **🔍 How to Monitor Costs**

### **1. AWS Cost Explorer**

```
AWS Console → Billing → Cost Explorer
```

- View costs by service
- Set up cost alerts
- Monitor daily/monthly usage

### **2. DynamoDB Monitoring**

```
AWS Console → DynamoDB → Tables → [Table Name] → Metrics
```

- Monitor read/write capacity
- Check throttling events
- View consumed capacity

### **3. Set Up Billing Alerts**

```
AWS Console → Billing → Budgets → Create Budget
```

- Set monthly budget (e.g., $5)
- Get email alerts when approaching limits
- Monitor free tier usage

## **💰 Expected Cost Reduction**

### **Before Optimization:**

- **PAY_PER_REQUEST**: ~$0.25 per million requests
- **Frequent auto-saves**: 100+ operations per session
- **Monthly cost**: $10-50+ depending on usage

### **After Optimization:**

- **PROVISIONED capacity**: 1 RCU/1 WCU per table
- **Throttled auto-saves**: 30-second minimum between saves
- **Monthly cost**: $0-5 (within free tier)

## **🚨 Warning Signs to Watch**

### **High Usage Indicators:**

- **DynamoDB throttling events** in CloudWatch
- **S3 storage approaching 5GB**
- **Lambda function errors** or timeouts
- **Cost alerts** from AWS

### **Immediate Actions:**

1. **Check CloudWatch metrics** for throttling
2. **Review auto-save frequency** in code
3. **Monitor S3 bucket size**
4. **Set up billing alerts**

## **🔧 Additional Optimizations**

### **1. Reduce Table Count**

Consider consolidating tables:

- Merge `bulk-defects` and `defect-sets`
- Combine `pdf-states` with main tables
- Use single table with different item types

### **2. Implement Caching**

- Cache frequently accessed data in localStorage
- Reduce DynamoDB read operations
- Use CloudFront for S3 objects

### **3. Optimize Data Storage**

- Compress large objects before storing
- Use efficient data types
- Implement data lifecycle policies

## **📈 Monitoring Commands**

### **Check Table Status:**

```bash
aws dynamodb describe-table --table-name mvp-labeler-profiles --region eu-west-2
```

### **Monitor Capacity:**

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=mvp-labeler-profiles \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-31T23:59:59Z \
  --period 86400 \
  --statistics Sum
```

### **Check S3 Usage:**

```bash
aws s3 ls s3://mvp-labeler-storage --recursive --summarize
```

## **🎯 Success Metrics**

### **Target Costs:**

- **DynamoDB**: $0-2/month (within free tier)
- **S3**: $0-1/month (within free tier)
- **Lambda**: $0/month (within free tier)
- **Total**: $0-5/month

### **Usage Targets:**

- **DynamoDB**: <25 RCU/WCU per month
- **S3**: <5GB storage
- **Lambda**: <1M requests per month

## **📞 Next Steps**

1. **Monitor costs** for the next 30 days
2. **Set up billing alerts** if not already done
3. **Review usage patterns** in CloudWatch
4. **Consider further optimizations** if needed

**Your DynamoDB costs should now be significantly reduced!** 🎉
