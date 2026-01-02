import { supabase } from '../lib/supabase';

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
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert([event])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
