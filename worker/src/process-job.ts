import { createHash } from "node:crypto";
import { supabase } from "./supabase.js";
import type { Job } from "./types.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function addEvent(jobId: string, step: string, message: string) {
  const { error } = await supabase.from("job_events").insert({
    job_id: jobId,
    step,
    message,
  });
  if (error) {
    throw new Error(`Event insert failed: ${error.message}`);
  }
}

async function updateJob(
  jobId: string,
  values: Partial<Pick<Job, "status" | "progress" | "error" | "result" | "completed_at">>
) {
  const { error } = await supabase.from("jobs").update(values).eq("id", jobId);
  if (error) {
    throw new Error(`Job update failed: ${error.message}`);
  }
}

function randomFailure(complexity: Job["complexity"]) {
  return complexity === "high" && Math.random() < 0.05;
}

export async function processJob(job: Job, simulationStepMs: number) {
  const startedAt = Date.now();

  await addEvent(job.id, "validate", "Validated input payload and started processing.");
  await updateJob(job.id, { progress: 25 });
  await sleep(simulationStepMs);

  await addEvent(job.id, "simulate_compute", "Simulated compute intensive workload.");
  await updateJob(job.id, { progress: 50 });
  await sleep(simulationStepMs);

  await addEvent(job.id, "aggregate", "Aggregated step outputs into a final artifact.");
  await updateJob(job.id, { progress: 75 });
  await sleep(simulationStepMs);

  if (randomFailure(job.complexity)) {
    const message = "Simulated high-complexity failure occurred.";
    await addEvent(job.id, "failure", message);
    await updateJob(job.id, {
      status: "failed",
      error: message,
      progress: 100,
      completed_at: new Date().toISOString(),
    });
    return;
  }

  const durationMs = Date.now() - startedAt;
  const checksum = createHash("sha256")
    .update(`${job.id}:${job.title}:${durationMs}`)
    .digest("hex")
    .slice(0, 16);

  await addEvent(job.id, "persist", "Stored computed result to the queue table.");
  await updateJob(job.id, {
    status: "completed",
    progress: 100,
    error: null,
    completed_at: new Date().toISOString(),
    result: {
      durationMs,
      complexity: job.complexity,
      checksum,
      summary: `Processed "${job.title}" successfully.`,
    },
  });
}
