const requiredPublicVars = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

type PublicEnvKey = (typeof requiredPublicVars)[number];

function readVar(name: string): string | undefined {
  const value = process.env[name];
  if (!value) {
    return undefined;
  }
  return value.trim();
}

export type PublicSupabaseConfig = {
  url: string;
  anonKey: string;
};

/** Runtime-safe read (works with Coolify env vars on the running container). */
export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const url = readVar("NEXT_PUBLIC_SUPABASE_URL")?.replace(/\/+$/, "");
  const anonKey = readVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export function getPublicSupabaseEnv(): Record<PublicEnvKey, string> {
  const values = {} as Record<PublicEnvKey, string>;
  for (const key of requiredPublicVars) {
    const value = readVar(key);
    if (!value) {
      throw new Error(`Missing required env var: ${key}`);
    }
    values[key] = value;
  }
  return values;
}

export function getServiceRoleKey(): string {
  const value = readVar("SUPABASE_SERVICE_ROLE_KEY");
  if (!value) {
    throw new Error("Missing required env var: SUPABASE_SERVICE_ROLE_KEY");
  }
  return value;
}
