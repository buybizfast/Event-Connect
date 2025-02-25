import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads an image to Firebase Storage
 * @param file The file to upload
 * @param path The path in storage where the file should be saved
 * @returns The download URL of the uploaded file
 */
export const uploadImage = async (file: File, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    
    // Add metadata including content type to help with CORS issues
    const metadata = {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000',
    };
    
    console.log(`Attempting to upload file to ${path} with content type ${file.type}`);
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('File uploaded successfully, getting download URL...');
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    
    // Check for CORS errors with more detailed logging
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      const isCorsError = 
        errorMessage.includes('cors') || 
        errorMessage.includes('access control') || 
        errorMessage.includes('preflight') ||
        errorMessage.includes('cross-origin');
      
      if (isCorsError) {
        console.warn('CORS issue detected. Please update Firebase Storage CORS settings:');
        console.warn('1. Create a cors.json file with appropriate settings');
        console.warn('2. Run: gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET');
        console.warn('Using placeholder image as fallback');
        return 'https://placehold.co/600x400';
      }
      
      // Check for network errors
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        console.warn('Network error detected when uploading to Firebase Storage');
        return 'https://placehold.co/600x400?text=Network+Error';
      }
      
      // Check for permission errors
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        console.warn('Permission denied when uploading to Firebase Storage');
        return 'https://placehold.co/600x400?text=Permission+Denied';
      }
    }
    
    // For any other errors, use a generic placeholder
    return 'https://placehold.co/600x400?text=Upload+Failed';
  }
};

/**
 * Uploads a profile image for a user
 * @param userId The user ID
 * @param file The image file to upload
 * @returns The download URL of the uploaded profile image
 */
export const uploadProfileImage = async (userId: string, file: File): Promise<string> => {
  const path = `profiles/${userId}/${Date.now()}-${file.name}`;
  return uploadImage(file, path);
};

/**
 * Uploads an event image
 * @param eventId The event ID
 * @param file The image file to upload
 * @returns The download URL of the uploaded event image
 */
export const uploadEventImage = async (eventId: string, file: File): Promise<string> => {
  const path = `events/${eventId}/${Date.now()}-${file.name}`;
  return uploadImage(file, path);
};

/**
 * Deletes an image from Firebase Storage
 * @param url The full URL of the image to delete
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    // Extract the path from the URL
    const decodedUrl = decodeURIComponent(url);
    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/`;
    let path = decodedUrl.replace(baseUrl, '');
    path = path.split('?')[0]; // Remove query parameters
    
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}; 