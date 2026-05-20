import { supabase } from "./supabase.js";
export async function upsertHeartbeat(workerId, status, jobsProcessed) {
    const { error } = await supabase.from("worker_heartbeats").upsert({
        worker_id: workerId,
        status,
        jobs_processed: jobsProcessed,
        metadata: { runtime: "node" },
        last_seen_at: new Date().toISOString(),
    }, { onConflict: "worker_id" });
    if (error) {
        throw new Error(`Heartbeat failed: ${error.message}`);
    }
}
