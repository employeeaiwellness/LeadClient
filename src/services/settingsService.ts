import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface UserSettings {
  id: string;
  user_id: string;
  theme: string;
  notifications_enabled: boolean;
  email_frequency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const q = query(collection(db, 'user_settings'), where('user_id', '==', userId));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as UserSettings;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw error;
  }
}

export async function updateUserSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings> {
  try {
    const q = query(collection(db, 'user_settings'), where('user_id', '==', userId));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Create if doesn't exist
      const now = new Date().toISOString();
      const docRef = doc(collection(db, 'user_settings'));
      await setDoc(docRef, {
        user_id: userId,
        ...updates,
        created_at: now,
        updated_at: now,
      });
      return { id: docRef.id, user_id: userId, ...updates, created_at: now, updated_at: now } as UserSettings;
    }

    const docRef = querySnapshot.docs[0].ref;
    const updatedData = { ...updates, updated_at: new Date().toISOString() };
    await updateDoc(docRef, updatedData);
    return { id: docRef.id, ...updates, ...updatedData } as UserSettings;
  } catch (error) {
    console.error('Error updating user settings:', error);
    throw error;
  }
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as UserProfile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }
}

export async function updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
  try {
    const docRef = doc(db, 'profiles', userId);
    const updatedData = { ...updates, updated_at: new Date().toISOString() };
    
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      const now = new Date().toISOString();
      await setDoc(docRef, {
        id: userId,
        ...updatedData,
        created_at: now,
      });
    } else {
      await updateDoc(docRef, updatedData);
    }
    
    return { id: userId, ...updates, ...updatedData } as UserProfile;
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
}
