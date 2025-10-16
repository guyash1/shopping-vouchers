export interface UserProfile {
  uid: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoURL?: string;
  authProvider: 'email' | 'google';
  createdAt: Date;
  updatedAt: Date;
}

