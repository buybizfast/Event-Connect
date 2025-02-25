# Firebase Setup Guide

This document provides instructions for setting up Firebase for this application, particularly focusing on resolving CORS issues with Firebase Storage.

## Firebase Storage CORS Configuration

If you're experiencing CORS errors when uploading images to Firebase Storage, follow these steps to configure CORS properly:

### 1. Install Google Cloud SDK

First, you need to install the Google Cloud SDK which includes the `gsutil` command-line tool:

- Download and install from: https://cloud.google.com/sdk/docs/install

### 2. Create a CORS Configuration File

Create a file named `cors.json` with the following content:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Length", "Content-Encoding", "Content-Disposition", "Cache-Control"]
  }
]
```

For production, you should replace `"*"` with your specific domains, such as:

```json
"origin": ["https://yourdomain.com", "https://www.yourdomain.com", "http://localhost:3000", "http://localhost:3001"]
```

### 3. Set CORS Configuration for Your Storage Bucket

Run the following command, replacing `YOUR_STORAGE_BUCKET` with your actual Firebase Storage bucket name (found in the Firebase console under Storage):

```bash
gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
```

### 4. Verify CORS Configuration

You can verify your CORS configuration with:

```bash
gsutil cors get gs://YOUR_STORAGE_BUCKET
```

## Firebase Authentication

Ensure your Firebase Authentication providers are properly configured in the Firebase Console:

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable the authentication methods you want to use (Email/Password, Google, etc.)

## Firebase Firestore

Make sure your Firestore security rules allow the operations your app needs:

1. Go to Firebase Console > Firestore Database > Rules
2. Configure appropriate rules for your application

Example rules that allow authenticated users to read all events but only modify their own:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.organizerId;
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Firebase Storage Rules

Configure Storage rules to allow authenticated users to upload images:

1. Go to Firebase Console > Storage > Rules
2. Configure appropriate rules for your application

Example rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /events/{eventId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /profiles/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Troubleshooting

If you continue to experience issues:

1. Check browser console for specific error messages
2. Verify that your Firebase configuration in `.env.local` is correct
3. Ensure you have the necessary Firebase services enabled in your project
4. Check that your Firebase plan (Spark/Blaze) supports the features you're using 