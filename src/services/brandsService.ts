import { supabase } from '../lib/supabase';

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
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBrand(brand: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .insert([brand])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBrand(id: string, updates: Partial<Brand>): Promise<Brand> {
  const { data, error } = await supabase
    .from('brands')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBrand(id: string): Promise<void> {
  const { error } = await supabase
    .from('brands')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
