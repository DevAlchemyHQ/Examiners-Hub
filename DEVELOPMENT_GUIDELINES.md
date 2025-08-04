# 🚀 Development Guidelines

## 🛡️ Protected Core Logic

### **NEVER MODIFY THESE FILES:**

- `src/store/metadataStore.ts` - Core state management
- `src/lib/services.ts` - AWS operations
- `src/components/SelectedImagesPanel.tsx` - Image logic
- `src/components/DownloadButton.tsx` - Download logic
- `lambda-package/simple-lambda/index.js` - Backend logic

### **WORKING FEATURES (DO NOT BREAK):**

- ✅ Image upload and selection
- ✅ Bulk defect creation
- ✅ Save/load defect sets
- ✅ Download functionality
- ✅ AWS data persistence

## 🔄 Feature Development Process

### **For New Features (like Stripe):**

1. **Create Feature Branch:**

   ```bash
   git checkout -b feature/stripe-integration
   ```

2. **Only Modify New Files:**

   - Create new components: `src/components/stripe/`
   - Create new services: `src/lib/stripe.ts`
   - Create new pages: `src/pages/stripe.page.tsx`

3. **Integration Points:**

   - Use existing auth from `authStore.ts`
   - Use existing user data from `metadataStore.ts`
   - Don't modify core logic, extend it

4. **Testing:**
   - Test on feature branch
   - Ensure core features still work
   - Deploy to staging first

## 🚨 Emergency Rollback

If something breaks:

```bash
# Rollback to stable version
git checkout stable-v1.0
git checkout -b hotfix/rollback
git push origin hotfix/rollback

# Deploy rollback
# Your app will be back to working state
```

## 📋 Feature Checklist

Before merging any feature:

- [ ] Core image upload still works
- [ ] Bulk defects still work
- [ ] Save/load defect sets still work
- [ ] Download functionality still works
- [ ] AWS persistence still works
- [ ] No protected files modified
- [ ] Feature tested thoroughly

## 🎯 Current Focus: Stripe Integration

**Safe to modify:**

- New Stripe components
- Payment flow pages
- Subscription management
- Billing UI

**Off-limits:**

- Core image handling
- Defect management
- Download system
- AWS operations
