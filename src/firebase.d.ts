import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { FirebaseApp } from 'firebase/app';

declare const auth: Auth;
declare const db: Firestore;
declare const storage: FirebaseStorage;
declare const app: FirebaseApp;

export { auth, db, storage };
export default app; 