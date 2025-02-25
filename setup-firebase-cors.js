#!/usr/bin/env node

/**
 * This script helps set up Firebase Storage CORS configuration
 * It requires the Google Cloud SDK to be installed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if gsutil is installed
function checkGsutilInstalled() {
  try {
    execSync('gsutil --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Create CORS configuration file
function createCorsFile() {
  const corsConfig = [
    {
      origin: ["*"],
      method: ["GET", "POST", "PUT", "DELETE", "HEAD"],
      maxAgeSeconds: 3600,
      responseHeader: ["Content-Type", "Content-Length", "Content-Encoding", "Content-Disposition", "Cache-Control"]
    }
  ];

  fs.writeFileSync(path.join(process.cwd(), 'cors.json'), JSON.stringify(corsConfig, null, 2));
  console.log('Created cors.json file in the current directory');
}

// Set CORS configuration for a bucket
function setCorsConfiguration(bucket) {
  try {
    console.log(`Setting CORS configuration for gs://${bucket}...`);
    execSync(`gsutil cors set cors.json gs://${bucket}`, { stdio: 'inherit' });
    console.log('CORS configuration set successfully!');
  } catch (error) {
    console.error('Error setting CORS configuration:', error.message);
  }
}

// Get CORS configuration for a bucket
function getCorsConfiguration(bucket) {
  try {
    console.log(`Getting current CORS configuration for gs://${bucket}...`);
    execSync(`gsutil cors get gs://${bucket}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Error getting CORS configuration:', error.message);
  }
}

// Main function
async function main() {
  console.log('Firebase Storage CORS Configuration Helper');
  console.log('=========================================');

  if (!checkGsutilInstalled()) {
    console.error('Error: gsutil is not installed or not in PATH');
    console.log('Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install');
    process.exit(1);
  }

  // Create CORS file if it doesn't exist
  if (!fs.existsSync(path.join(process.cwd(), 'cors.json'))) {
    createCorsFile();
  } else {
    console.log('Using existing cors.json file');
  }

  // Get bucket name from user
  rl.question('Enter your Firebase Storage bucket name (e.g., your-project-id.appspot.com): ', (bucket) => {
    if (!bucket) {
      console.error('Error: Bucket name is required');
      rl.close();
      return;
    }

    // Set CORS configuration
    setCorsConfiguration(bucket);
    
    // Get and display the current CORS configuration
    getCorsConfiguration(bucket);
    
    console.log('\nIf you continue to experience CORS issues:');
    console.log('1. Make sure you\'re authenticated with the correct Google account');
    console.log('2. Verify that you have the necessary permissions for the bucket');
    console.log('3. Check if your Firebase project is on the Blaze plan (required for some operations)');
    
    rl.close();
  });
}

main().catch(console.error); 