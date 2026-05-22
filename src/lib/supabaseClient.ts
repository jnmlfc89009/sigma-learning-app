import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (supabaseInstance) return supabaseInstance;

  // 1. Try to read from Vite client-side environment parameters (if available as public vars)
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (envUrl && envKey) {
    supabaseInstance = createClient(envUrl, envKey);
    return supabaseInstance;
  }

  // 2. Access the secure Express backend config endpoint to read non-prefixed env parameters
  try {
    const res = await fetch('/api/supabase-config');
    if (res.ok) {
      const config = await res.json();
      if (config.supabaseUrl && config.supabaseKey) {
        supabaseInstance = createClient(config.supabaseUrl, config.supabaseKey);
        return supabaseInstance;
      }
    }
  } catch (err) {
    console.error('Failed to load Supabase configuration from server API:', err);
  }

  return null;
}
