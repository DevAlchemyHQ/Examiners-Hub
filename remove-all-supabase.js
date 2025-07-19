#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🧹 Removing all Supabase files and references...');

// Files to delete
const filesToDelete = [
  'src/lib/supabase.ts',
  'src/lib/storage.ts',
  'src/lib/migrationMonitor.ts',
  'src/components/MigrationStatus.tsx',
  'src/components/MigrationControls.tsx',
  'src/api/stripe-webhook.js',
  'supabase/',
  'MIGRATION_STATUS.md',
  'MIGRATION_SUMMARY.md',
  'MIGRATION_MONITORING.md',
  'MIGRATION_CHECKLIST.md',
  'DYNAMODB_SETUP.md',
  'AWS_MIGRATION_GUIDE.md',
  'test-local.md'
];

// Delete files
filesToDelete.forEach(file => {
  if (fs.existsSync(file)) {
    if (fs.lstatSync(file).isDirectory()) {
      fs.rmSync(file, { recursive: true, force: true });
      console.log(`🗑️  Deleted directory: ${file}`);
    } else {
      fs.unlinkSync(file);
      console.log(`🗑️  Deleted file: ${file}`);
    }
  }
});

// Files to clean up (remove Supabase imports and references)
const filesToClean = [
  'src/store/quailMapStore.ts',
  'src/store/projectStore.ts', 
  'src/store/pdfStore.ts',
  'src/store/profileStore.ts',
  'src/components/profile/EditProfile.tsx',
  'src/components/SelectedImagesPanel.tsx',
  'package.json',
  'env.example',
  'README.md'
];

// Clean up files
filesToClean.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Remove Supabase imports
    content = content.replace(/import.*supabase.*from.*['"][^'"]*['"];?\n?/gi, '');
    content = content.replace(/import.*@supabase\/supabase-js.*;?\n?/gi, '');
    content = content.replace(/import.*createClient.*from.*['"]@supabase\/supabase-js['"];?\n?/gi, '');
    
    // Remove Supabase client creation
    content = content.replace(/const supabase = createClient\([^)]+\);?\n?/gi, '');
    content = content.replace(/const supabase = new SupabaseClient\([^)]+\);?\n?/gi, '');
    
    // Remove Supabase URL references
    content = content.replace(/https:\/\/[^\/]*\.supabase\.co\/[^\s'"]*/gi, '');
    
    // Remove Supabase package from package.json
    if (file === 'package.json') {
      content = content.replace(/"@supabase\/supabase-js":\s*"[^"]*",?\n?/gi, '');
    }
    
    // Remove Supabase env vars from env.example
    if (file === 'env.example') {
      content = content.replace(/# Supabase Configuration\nVITE_SUPABASE_URL=.*\nVITE_SUPABASE_ANON_KEY=.*\n/gi, '');
    }
    
    // Remove Supabase references from README
    if (file === 'README.md') {
      content = content.replace(/Backend.*Supabase.*\n/gi, '');
      content = content.replace(/Edit.*\.env\.local.*Supabase.*\n/gi, '');
    }
    
    fs.writeFileSync(file, content);
    console.log(`🧽 Cleaned: ${file}`);
  }
});

console.log('✅ All Supabase files and references removed!');
console.log('📝 Next steps:');
console.log('1. Run: npm install (to remove @supabase/supabase-js)');
console.log('2. Commit and push changes');
console.log('3. Deploy to Vercel'); 