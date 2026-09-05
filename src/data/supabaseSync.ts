import { supabase } from '../supabaseClient';

export const hasSupabase = (): boolean => Boolean(supabase);

export const loadSupabaseCollection = async <T>(table: string): Promise<T[] | null> => {
  if (!supabase) return null;
  const columns = table === 'items' ? 'id,data,quantity' : 'id,data';
  const { data, error } = await supabase.from(table).select(columns);
  if (error) {
    console.error(`Unable to load ${table} from Supabase`, error);
    throw error;
  }
  const rows = (data || []) as unknown as Array<{ data: T; quantity?: number }>;
  return rows.map((row) => {
    if (table !== 'items') return row.data as T;
    return { ...(row.data as T), quantity: row.quantity ?? (row.data as T & { quantity?: number }).quantity ?? 1 } as T;
  });
};

export const insertSupabaseRecord = async <T extends { id: string }>(table: string, value: T): Promise<void> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).insert({ id: value.id, data: value, ...(table === 'items' ? { quantity: (value as T & { quantity?: number }).quantity ?? 1 } : {}), updated_at: new Date().toISOString() });
  if (error) {
    console.error(`Unable to insert ${table} record`, error);
    throw error;
  }
};

export const updateSupabaseRecord = async <T extends { id: string }>(table: string, value: T): Promise<void> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).update({ data: value, ...(table === 'items' ? { quantity: (value as T & { quantity?: number }).quantity ?? 1 } : {}), updated_at: new Date().toISOString() }).eq('id', value.id);
  if (error) {
    console.error(`Unable to update ${table} record`, error);
    throw error;
  }
};

export const deleteSupabaseRecord = async (table: string, id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Unable to delete ${table} record`, error);
    throw error;
  }
};

export const clearSupabaseCollection = async (table: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).delete().not('id', 'is', null);
  if (error) {
    console.error(`Unable to clear ${table}`, error);
    throw error;
  }
};

export const uploadItemImage = async (file: File): Promise<string | null> => {
  if (!supabase) return null;
  const path = `${globalThis.crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error } = await supabase.storage.from('item-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) {
    console.error('Unable to upload item image', error);
    throw error;
  }
  const { data } = supabase.storage.from('item-images').getPublicUrl(path);
  if (!data.publicUrl) throw new Error('Supabase did not return a public image URL.');
  return data.publicUrl;
};

export const getItemImageUrl = (imageValue?: string): string | undefined => {
  if (!imageValue) return undefined;
  if (imageValue.startsWith('data:') || /^https?:\/\//i.test(imageValue)) return imageValue;
  if (!supabase) return imageValue;
  return supabase.storage.from('item-images').getPublicUrl(imageValue).data.publicUrl;
};
