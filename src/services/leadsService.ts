import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

export interface Lead {
  id: string;
  user_id: string;
  brand_id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: string;
  source?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export async function getLeads(userId: string): Promise<Lead[]> {
  try {
    const q = query(
      collection(db, 'leads'),
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Lead));
  } catch (error) {
    console.error('Error fetching leads:', error);
    throw error;
  }
}

export async function createLead(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>): Promise<Lead> {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'leads'), {
      ...lead,
      created_at: now,
      updated_at: now,
    });
    return {
      id: docRef.id,
      ...lead,
      created_at: now,
      updated_at: now,
    } as Lead;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
  try {
    const updatedData = { ...updates, updated_at: new Date().toISOString() };
    await updateDoc(doc(db, 'leads', id), updatedData);
    return { id, ...updates, ...updatedData } as Lead;
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
}

export async function deleteLead(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'leads', id));
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}
