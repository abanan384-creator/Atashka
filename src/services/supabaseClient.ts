import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://znsjrujhsadiywsimywf.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpuc2pydWpoc2FkaXl3c2lteXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzA3MjcsImV4cCI6MjEwNTQ0NjcyN30.q4vuEiKKdgEbwkWV1tp-pGNqfAgtz4yQKx4UJukoLk0";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  DEFAULT_SUPABASE_URL;

const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
