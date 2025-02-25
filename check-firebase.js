// Script to check Firebase connection
require('dotenv').config({ path: '.env.local' });

console.log('Checking Firebase configuration...');
console.log('Environment variables:');
console.log('- NEXT_PUBLIC_FIREBASE_API_KEY:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ Not set');
console.log('- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Not set');
console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Not set');
console.log('- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? '✅ Set' : '❌ Not set');
console.log('- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? '✅ Set' : '❌ Not set');
console.log('- NEXT_PUBLIC_FIREBASE_APP_ID:', process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ Not set');

// Check if Firebase emulator is enabled
console.log('- NEXT_PUBLIC_USE_FIREBASE_EMULATORS:', process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ? '✅ Set to ' + process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS : '❌ Not set');

console.log('\nTo fix Firebase permission issues:');
console.log('1. Make sure your Firebase project exists and is properly configured');
console.log('2. Ensure your security rules in firestore.rules and storage.rules are correct');
console.log('3. Check that your environment variables in .env.local match your Firebase project');
console.log('4. If using emulators, make sure they are running with: npm run firebase:emulators:start');
console.log('5. If not using emulators, ensure your account has proper permissions in the Firebase console');

console.log('\nFor development purposes, you can use these permissive security rules:');
console.log('\nFirestore Rules:');
console.log('```');
console.log('rules_version = \'2\';');
console.log('service cloud.firestore {');
console.log('  match /databases/{database}/documents {');
console.log('    match /{document=**} {');
console.log('      allow read, write: if true;');
console.log('    }');
console.log('  }');
console.log('}');
console.log('```');

console.log('\nStorage Rules:');
console.log('```');
console.log('rules_version = \'2\';');
console.log('service firebase.storage {');
console.log('  match /b/{bucket}/o {');
console.log('    match /{allPaths=**} {');
console.log('      allow read, write: if true;');
console.log('    }');
console.log('  }');
console.log('}');
console.log('```');

console.log('\nRemember to replace these with proper security rules before deploying to production!'); 