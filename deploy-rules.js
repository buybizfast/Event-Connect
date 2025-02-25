const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Deploying Firebase security rules...');

// Use npx to run firebase commands without global installation
console.log('Checking if user is logged in to Firebase...');
try {
  execSync('npx firebase projects:list', { stdio: 'pipe' });
  console.log('Already logged in to Firebase');
} catch (error) {
  console.log('Please log in to Firebase:');
  execSync('npx firebase login', { stdio: 'inherit' });
}

// Deploy Firestore rules
console.log('Deploying Firestore rules...');
try {
  execSync('npx firebase deploy --only firestore:rules', { stdio: 'inherit' });
  console.log('✅ Firestore rules deployed successfully');
} catch (error) {
  console.error('❌ Failed to deploy Firestore rules:', error.message);
}

// Deploy Storage rules
console.log('Deploying Storage rules...');
try {
  execSync('npx firebase deploy --only storage', { stdio: 'inherit' });
  console.log('✅ Storage rules deployed successfully');
} catch (error) {
  console.error('❌ Failed to deploy Storage rules:', error.message);
}

console.log('Deployment complete!'); 