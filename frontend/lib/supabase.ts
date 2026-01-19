import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Create the Supabase client only if environment variables are available
// This prevents build-time errors when env vars aren't set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
