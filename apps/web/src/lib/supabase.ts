import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

if (!supabaseUrl || !supabaseKey) {
    // console.error("Missing Supabase environment variables!");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
