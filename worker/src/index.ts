import { upsertHeartbeat } from "./heartbeat.js";
import { processJob } from "./process-job.js";
import { supabase, workerConfig } from "./supabase.js";
import type { Job } from "./types.js";

let stopRequested = false;
let jobsProcessed = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function claimNextJob(): Promise<Job | null> {
  const { data, error } = await supabase.rpc("claim_next_job", {
    worker_name: workerConfig.workerId,
  });
  if (error) {
    throw new Error(`claim_next_job failed: ${error.message}`);
  }
  return data?.[0] ?? null;
}

async function runWorker() {
  while (!stopRequested) {
    await upsertHeartbeat(workerConfig.workerId, "idle", jobsProcessed);
    const job = await claimNextJob();

    if (!job) {
      await sleep(workerConfig.pollIntervalMs);
      continue;
    }

    await upsertHeartbeat(workerConfig.workerId, "processing", jobsProcessed);
    await processJob(job, workerConfig.simulationStepMs);
    jobsProcessed += 1;
    await upsertHeartbeat(workerConfig.workerId, "idle", jobsProcessed);
  }
}

process.on("SIGTERM", async () => {
  stopRequested = true;
  await upsertHeartbeat(workerConfig.workerId, "stopping", jobsProcessed);
});

process.on("SIGINT", async () => {
  stopRequested = true;
  await upsertHeartbeat(workerConfig.workerId, "stopping", jobsProcessed);
});

runWorker().catch(async (error) => {
  console.error(error);
  try {
    await upsertHeartbeat(workerConfig.workerId, "offline", jobsProcessed);
  } catch (heartbeatError) {
    console.error(heartbeatError);
  }
  process.exit(1);
});
