import fs from 'fs';

const files = ['src/components/LessonPlayer.tsx', 'src/components/StoreScreen.tsx', 'src/App.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  content = content.replace(/localStorage\.getItem/g, 'safeStorage.getItem');
  content = content.replace(/localStorage\.setItem/g, 'safeStorage.setItem');
  let finalContent = "";
  if (!content.includes('import { safeStorage }') && file !== 'src/App.tsx' && file !== 'src/components/StoreScreen.tsx' && file !== 'src/components/LessonPlayer.tsx') {
    // wait I need to add import if it's missing!
  }
  
  // Let me just manually check if safeStorage is imported.
  if (!content.includes('safeStorage')) {
      content = `import { safeStorage } from '../lib/safeStorage';\n` + content;
  }
  // For App.tsx it's: import { safeStorage } from './lib/safeStorage';
  if (file === 'src/App.tsx' && !content.includes('import { safeStorage }')) {
       content = `import { safeStorage } from './lib/safeStorage';\n` + content;
  } else if (file !== 'src/App.tsx' && !content.includes('import { safeStorage }')) {
       content = `import { safeStorage } from '../lib/safeStorage';\n` + content;
  }

  fs.writeFileSync(file, content);
}
