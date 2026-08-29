import { supabase } from '../supabaseClient';

export const hasSupabase = (): boolean => Boolean(supabase);

export const loadSupabaseCollection = async <T>(table: string): Promise<T[] | null> => {
  if (!supabase) return null;
  const { data, error } = await supabase.from(table).select('id,data');
  if (error) {
    console.error(`Unable to load ${table} from Supabase`, error);
    return null;
  }
  return (data || []).map((row) => row.data as T);
};

export const upsertSupabaseRecord = async <T extends { id: string }>(table: string, value: T): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from(table).upsert({ id: value.id, data: value, updated_at: new Date().toISOString() });
  if (error) console.error(`Unable to save ${table} record`, error);
};

export const deleteSupabaseRecord = async (table: string, id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) console.error(`Unable to delete ${table} record`, error);
};

export const uploadItemImage = async (file: File): Promise<string | null> => {
  if (!supabase) return null;
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
  const { error } = await supabase.storage.from('item-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) {
    console.error('Unable to upload item image', error);
    return null;
  }
  const { data } = supabase.storage.from('item-images').getPublicUrl(path);
  return data.publicUrl;
};
