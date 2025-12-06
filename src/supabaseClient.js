// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Optional: useful debug (utaiona mara moja ikiwa env haijasomwa)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase ENV variables missing!");
  console.log("VITE_SUPABASE_URL:", supabaseUrl);
  console.log("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
