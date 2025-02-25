const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase configuration from your .env.local
const firebaseConfig = {
  apiKey: "AIzaSyAnKKeZCkdh-546rARjPUHK1omgopb9YHs",
  authDomain: "ai-event-b7d26.firebaseapp.com",
  projectId: "ai-event-b7d26",
  storageBucket: "ai-event-b7d26.firebasestorage.app",
  messagingSenderId: "229116904848",
  appId: "1:229116904848:web:39ba8d00665a6f702c5f15"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createEvent() {
  try {
    // Create event1 document
    await setDoc(doc(db, 'events', 'event1'), {
      title: 'Tech Conference 2023',
      description: 'Annual technology conference featuring the latest innovations',
      date: new Date('2023-12-15').toISOString(),
      location: 'San Francisco, CA',
      organizer: 'Tech Events Inc.',
      maxAttendees: 200,
      attendees: 0,
      imageUrl: 'https://example.com/event-image.jpg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('Event created successfully!');
  } catch (error) {
    console.error('Error creating event:', error);
  }
}

createEvent(); 