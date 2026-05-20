import { supabase } from "./supabase.js";

type WorkerState = "idle" | "processing" | "stopping" | "offline";

export async function upsertHeartbeat(
  workerId: string,
  status: WorkerState,
  jobsProcessed: number
) {
  const { error } = await supabase.from("worker_heartbeats").upsert(
    {
      worker_id: workerId,
      status,
      jobs_processed: jobsProcessed,
      metadata: { runtime: "node" },
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "worker_id" }
  );

  if (error) {
    throw new Error(`Heartbeat failed: ${error.message}`);
  }
}
