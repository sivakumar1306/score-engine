"use client";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export function ConfigBanner() {
  if (isSupabaseConfigured) return null;
  return (
    <div className="bg-amber/15 px-4 py-2 text-center text-sm text-amber">
      Supabase isn&apos;t configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README).
    </div>
  );
}
