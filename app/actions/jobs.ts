"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const createJobSchema = z.object({
  title: z.string().trim().min(3).max(120),
  complexity: z.enum(["low", "medium", "high"]),
});

export async function createJob(formData: FormData) {
  const payload = createJobSchema.parse({
    title: formData.get("title"),
    complexity: formData.get("complexity"),
  });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("jobs").insert({
    title: payload.title,
    complexity: payload.complexity,
    status: "pending",
    input: { createdBy: "dashboard", complexity: payload.complexity },
    progress: 0,
  });

  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  revalidatePath("/");
}

const retryJobSchema = z.object({
  jobId: z.string().uuid(),
});

export async function retryJob(formData: FormData) {
  const payload = retryJobSchema.parse({
    jobId: formData.get("jobId"),
  });

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "pending",
      progress: 0,
      error: null,
      result: null,
      worker_id: null,
      claimed_at: null,
      completed_at: null,
    })
    .eq("id", payload.jobId);

  if (error) {
    throw new Error(`Failed to retry job: ${error.message}`);
  }

  revalidatePath("/");
}
