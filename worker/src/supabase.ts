import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const workerConfig = {
  supabaseUrl:
    process.env.SUPABASE_URL ?? requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  workerId: process.env.WORKER_ID ?? "worker-1",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 2000),
  simulationStepMs: Number(process.env.SIMULATION_STEP_MS ?? 1200),
};

export const supabase = createClient(
  workerConfig.supabaseUrl,
  workerConfig.serviceRoleKey,
  { auth: { persistSession: false } }
);
