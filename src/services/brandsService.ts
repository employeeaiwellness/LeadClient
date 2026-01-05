import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  website?: string;
  logo_url?: string;
  industry?: string;
  created_at: string;
  updated_at: string;
}

export async function getBrands(userId: string): Promise<Brand[]> {
  try {
    const q = query(
      collection(db, 'brands'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Brand));
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
}

export async function createBrand(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<Brand> {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'brands'), {
      ...brand,
      created_at: now,
      updated_at: now,
    });
    return {
      id: docRef.id,
      ...brand,
      created_at: now,
      updated_at: now,
    } as Brand;
  } catch (error) {
    console.error('Error creating brand:', error);
    throw error;
  }
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
  try {
    const updatedData = { ...updates, updated_at: new Date().toISOString() };
    await updateDoc(doc(db, 'brands', id), updatedData);
    return { id, ...updates, ...updatedData } as Brand;
  } catch (error) {
    console.error('Error updating brand:', error);
    throw error;
  }
}

export async function deleteBrand(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'brands', id));
  } catch (error) {
    console.error('Error deleting brand:', error);
    throw error;
  }
}
