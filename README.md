# Automobile Business Event Management

This is a Next.js application for managing automobile business events. The application uses Firebase for authentication, data storage, and file storage.

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Fixing Firebase Permission Issues

The application is currently experiencing Firebase permission issues. Here's how to fix them:

### 1. Update Firestore Security Rules

Go to your Firebase Console > Firestore Database > Rules and update the rules to:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all users for all documents
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 2. Update Storage Security Rules

Go to your Firebase Console > Storage > Rules and update the rules to:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
    
    // For production, use more restrictive rules like:
    // match /events/{eventId}/{fileName} {
    //   allow read: if true;
    //   allow write: if request.auth != null;
    // }
  }
}
```

### 3. Enable CORS for Firebase Storage

To fix CORS issues with Firebase Storage:

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:
   ```bash
   firebase init
   ```

4. Create a `cors.json` file in your project root:
   ```json
   [
     {
       "origin": ["*"],
       "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
       "maxAgeSeconds": 3600
     }
   ]
   ```

5. Set CORS configuration for your storage bucket:
   ```bash
   gsutil cors set cors.json gs://your-storage-bucket-name
   ```

## Fallback Mechanism

The application has a fallback mechanism that saves events to localStorage when Firebase is not available or when permission issues occur. This ensures that users can still create and view events even when Firebase is not accessible.

## Features

- User authentication with Firebase
- Event creation and management
- Image upload for events
- Responsive design with Tailwind CSS
- Fallback to localStorage when Firebase is unavailable