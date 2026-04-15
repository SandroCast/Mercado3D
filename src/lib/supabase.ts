import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Substitua pelos valores do seu projeto Supabase
// Dashboard → Settings → API
const SUPABASE_URL = "https://bxwsbqdybmjakfvetohj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4d3NicWR5Ym1qYWtmdmV0b2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTU4OTQsImV4cCI6MjA5MTc3MTg5NH0.s1zwrcvHzbUzy7J2UAn1zgBo-zllzr3bYEVpWXHwDm0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
