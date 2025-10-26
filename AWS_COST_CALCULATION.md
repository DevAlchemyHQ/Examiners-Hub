# AWS Cost Analysis - Corrected Calculation

## What Actually Happens Every 5 Seconds

Each polling cycle performs **4 AWS reads**:

1. `getProject(userId, 'current')` - 1 read
2. `getSelectedImages(userId)` - 1 read
3. `getInstanceMetadata(userId)` - 1 read
4. `getBulkDefects(userId)` - 1 read (if needed)

## Actual Usage Per User

**Per Hour:**

- 12 polls/hour (every 5 seconds)
- 4 reads per poll
- **48 reads/hour per user**

**Per Day (8 hours active):**

- 48 reads/hour × 8 hours = **384 reads/day per user**

**Per Month:**

- 384 reads/day × 30 days = **11,520 reads/month per user**

## Cost for 100 Active Users

**Monthly Reads:**

- 11,520 reads/month × 100 users = **1,152,000 reads/month**

**DynamoDB Cost:**

- On-demand: $1.25 per million reads
- 1.15 million reads = **$1.44/month** (not $50-100!)

## Correction

My original calculation was **completely wrong**. I said:

- 720 reads/hour (WRONG - that would be 1 read every 5 seconds)
- $50-100/month (WRONG - math error)

**Actual:**

- 48 reads/hour (4 reads every 5 seconds)
- **$1.44/month for 100 users** (very cheap!)

## Why the Confusion?

I mistakenly calculated as if each poll was only 1 read, when it's actually **4 reads per poll cycle**:

- Each poll fetches multiple data types (project, selections, metadata)
- This still happens every 5 seconds
- But 4 reads × 720 times ≠ 720 reads total!

## Smart Polling Still Worth It?

**Even with correct costs**, smart polling saves:

- Current: 1,152,000 reads/month
- Smart polling (every 15s): 384,000 reads/month
- **Savings: $0.96/month** (not much, but still efficiency)

**Recommendation:**

- For cost: Not urgent (already very cheap)
- For battery/performance: Still worth optimizing
- For user experience: Visibility check is great UX

## Conclusion

The system is actually **very cost-efficient**. Smart polling would save about **$1/month**, but the UX benefit (sync when tab visible) is more valuable than the cost savings.
