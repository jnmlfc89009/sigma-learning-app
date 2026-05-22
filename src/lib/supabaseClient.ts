import { SupabaseClient } from '@supabase/supabase-js';
import { initializeSupabaseClient } from './clientDb';

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  return initializeSupabaseClient();
}
