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
  return value;
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
