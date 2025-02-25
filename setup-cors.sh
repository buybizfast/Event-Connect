#!/bin/bash

# Check if Firebase CLI is installed
if ! command -v npx &> /dev/null; then
    echo "npx is not installed. Please install Node.js and npm first."
    exit 1
fi

# Check if user is logged in
npx firebase projects:list &> /dev/null
if [ $? -ne 0 ]; then
    echo "You are not logged in to Firebase. Please log in first."
    npx firebase login
fi

# Get the storage bucket from .env.local
STORAGE_BUCKET=$(grep NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET .env.local | cut -d '=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$STORAGE_BUCKET" ]; then
    echo "Could not find storage bucket in .env.local"
    echo "Please enter your Firebase Storage bucket name (e.g., your-project-id.appspot.com):"
    read STORAGE_BUCKET
fi

echo "Setting CORS configuration for bucket: $STORAGE_BUCKET"

# Extract project ID from the bucket name
PROJECT_ID=$(echo $STORAGE_BUCKET | cut -d '.' -f1)
echo "Using project ID: $PROJECT_ID"

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "Creating cors.json file..."
    cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
EOF
    echo "cors.json created successfully."
fi

# Set CORS configuration using Firebase CLI
echo "Setting CORS configuration..."
npx firebase storage:cors set cors.json --project $PROJECT_ID

if [ $? -eq 0 ]; then
    echo "CORS configuration set successfully!"
    echo "Your Firebase Storage should now accept requests from your application."
else
    echo "Failed to set CORS configuration using Firebase CLI."
    echo "You can manually set CORS by running:"
    echo "gsutil cors set cors.json gs://$STORAGE_BUCKET"
    
    echo ""
    echo "Alternatively, you can set CORS through the Firebase Console:"
    echo "1. Go to https://console.firebase.google.com/project/$PROJECT_ID/storage"
    echo "2. Click on 'Rules' tab"
    echo "3. Add the following CORS configuration:"
    echo ""
    cat cors.json
fi 