import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://lxywmfdxatxaskiaydxw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4eXdtZmR4YXR4YXNraWF5ZHh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0NTMwMzUsImV4cCI6MjA3NTAyOTAzNX0.DGA9oFo17_eWKVBz3xKep_pGr34dmjhgajWNrS-WIxA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);