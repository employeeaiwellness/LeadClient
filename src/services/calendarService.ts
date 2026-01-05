import { db } from '../lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy } from 'firebase/firestore';

export interface CalendarEvent {
  id: string;
  user_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  event_date: string;
  event_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  try {
    const q = query(
      collection(db, 'calendar_events'),
      where('user_id', '==', userId),
      orderBy('event_date', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as CalendarEvent));
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'calendar_events'), {
      ...event,
      created_at: now,
      updated_at: now,
    });
    return {
      id: docRef.id,
      ...event,
      created_at: now,
      updated_at: now,
    } as CalendarEvent;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const updatedData = { ...updates, updated_at: new Date().toISOString() };
    await updateDoc(doc(db, 'calendar_events', id), updatedData);
    return { id, ...updates, ...updatedData } as CalendarEvent;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'calendar_events', id));
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}
