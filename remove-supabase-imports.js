import fs from 'fs';
import path from 'path';

const filesToFix = [
  'src/store/pdfStore.ts',
  'src/store/quailMapStore.ts', 
  'src/store/projectStore.ts',
  'src/store/profileStore.ts',
  'src/lib/storage.ts',
  'src/pages/projects.pages.tsx',
  'src/components/auth/AuthForm.tsx',
  'src/components/auth/OTPVerification.tsx',
  'src/components/auth/ResetPassword.tsx',
  'src/components/auth/SetNewPassword.tsx',
  'src/components/profile/EditProfile.tsx'
];

function removeSupabaseImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove supabase imports
    content = content.replace(/import.*supabase.*from.*['"]\.\.\/\.\.\/lib\/supabase['"];?\n?/g, '');
    content = content.replace(/import.*supabase.*from.*['"]\.\.\/lib\/supabase['"];?\n?/g, '');
    content = content.replace(/import.*supabase.*from.*['"]\.\/lib\/supabase['"];?\n?/g, '');
    content = content.replace(/import.*from.*['"]\.\.\/\.\.\/lib\/supabase['"];?\n?/g, '');
    content = content.replace(/import.*from.*['"]\.\.\/lib\/supabase['"];?\n?/g, '');
    content = content.replace(/import.*from.*['"]\.\/lib\/supabase['"];?\n?/g, '');
    
    // Remove @supabase/supabase-js imports
    content = content.replace(/import.*from.*['"]@supabase\/supabase-js['"];?\n?/g, '');
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.log(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🚀 Removing all supabase imports...');

filesToFix.forEach(file => {
  if (fs.existsSync(file)) {
    removeSupabaseImports(file);
  } else {
    console.log(`⚠️ File not found: ${file}`);
  }
});

console.log('✅ Supabase imports removal complete!'); 