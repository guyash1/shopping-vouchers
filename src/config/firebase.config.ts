// קובץ קונפיגורציית Firebase
// הקונפיגורציה נטענת ממשתני סביבה

// יש להגדיר את משתני הסביבה הבאים ב-.env.local:
// REACT_APP_FIREBASE_API_KEY
// REACT_APP_FIREBASE_AUTH_DOMAIN
// REACT_APP_FIREBASE_PROJECT_ID
// REACT_APP_FIREBASE_STORAGE_BUCKET
// REACT_APP_FIREBASE_MESSAGING_SENDER_ID
// REACT_APP_FIREBASE_APP_ID

// וודא כי .env.local נמצא ב-.gitignore ולא נשלח לגיט
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

export default firebaseConfig;
