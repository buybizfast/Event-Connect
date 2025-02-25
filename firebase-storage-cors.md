# Firebase Storage CORS Configuration Guide

## Your Firebase Project Information
- **Project ID:** `ai-event-b7d26`
- **Storage Bucket:** `ai-event-b7d26.appspot.com`

## Method 1: Using the Firebase Console (Recommended)

Since you're having trouble finding your bucket in Google Cloud Console, let's try setting CORS through Firebase Storage Rules instead:

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`AI EVENT`)
3. Click on "Storage" in the left sidebar
4. Click on the "Rules" tab
5. Update your rules to include CORS configuration:

```
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Your existing rules here (keep these)
      allow read, write: if request.auth != null;
      
      // Add CORS configuration
      allow origin: ["*"];
      allow methods: ["GET", "HEAD", "PUT", "POST", "DELETE"];
      allow headers: ["*"];
      max_age_seconds: 3600;
    }
  }
}
```

6. Click "Publish" to save your changes

## Method 2: Using Google Cloud Console

If you want to try the Google Cloud Console approach:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're logged in with the same account you use for Firebase (jacques@rebrandmint.com)
3. In the search bar at the top, search for "Storage" and select "Cloud Storage"
4. Look for your bucket in the list (it should be named `ai-event-b7d26.appspot.com`)
5. If you don't see it, try these steps:
   - Click on the project selector at the top of the page
   - Make sure "ai-event-b7d26" is selected
   - If it's not in the list, click "ALL" to see all projects
   - Select "ai-event-b7d26" project

Direct link to your bucket (try this): [ai-event-b7d26.appspot.com bucket](https://console.cloud.google.com/storage/browser/ai-event-b7d26.appspot.com)

## Method 3: Using the Firebase CLI (Alternative)

If you want to try using the Firebase CLI:

1. Create a file named `cors.json` with the following content:
```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

2. Install the Google Cloud SDK (which includes gsutil):
```bash
# For macOS
curl https://sdk.cloud.google.com | bash
```

3. Initialize the SDK and log in:
```bash
gcloud init
```

4. Set the CORS configuration:
```bash
gsutil cors set cors.json gs://ai-event-b7d26.appspot.com
```

## Testing Your CORS Configuration

After setting up CORS, test if it's working:

1. Restart your Next.js application:
```bash
npm run dev -- -p 3000
```

2. Try creating a new event with an image upload
3. Check the browser console for any CORS-related errors

## Troubleshooting

If you're still having issues:

1. **Check Firebase Authentication**: Make sure you're properly authenticated in your app
2. **Verify Storage Rules**: Ensure your Firebase Storage rules allow the operations you're trying to perform
3. **Check Network Tab**: In your browser's developer tools, look at the Network tab for specific error messages
4. **Try a Different Browser**: Sometimes CORS issues can be browser-specific
5. **Check Content Type**: Make sure your uploads include the correct Content-Type header

## Alternative Solution: Use Local Storage Fallback

Your application already has a fallback mechanism for when Firebase Storage is not accessible. If you continue to have CORS issues, you can rely on this fallback mechanism temporarily while you resolve the CORS configuration.

The code in `src/app/events/create/page.tsx` will automatically use a placeholder image and save events locally if Firebase Storage is not accessible. 