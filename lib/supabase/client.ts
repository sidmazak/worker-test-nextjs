"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { PublicSupabaseConfig } from "@/lib/supabase/env";

export function createSupabaseBrowserClient(config: PublicSupabaseConfig) {
  return createBrowserClient(config.url, config.anonKey);
}
