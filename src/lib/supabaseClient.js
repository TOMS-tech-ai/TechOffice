// supabaseClient.js
// ضع هذا الملف في: src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error('❌ أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
