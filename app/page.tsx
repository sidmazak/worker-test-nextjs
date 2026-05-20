import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getPublicSupabaseConfig } from "@/lib/supabase/env";
import type { Job, JobEvent, WorkerHeartbeat } from "@/lib/types/database";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabaseConfig = getPublicSupabaseConfig();
  let jobs: Job[] = [];
  let events: JobEvent[] = [];
  let workers: WorkerHeartbeat[] = [];

  try {
    const supabase = createSupabaseAdminClient();
    const [jobsRes, eventsRes, workersRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("job_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("worker_heartbeats")
        .select("*")
        .order("last_seen_at", { ascending: false })
        .limit(10),
    ]);
    jobs = (jobsRes.data as Job[]) ?? [];
    events = (eventsRes.data as JobEvent[]) ?? [];
    workers = (workersRes.data as WorkerHeartbeat[]) ?? [];
  } catch {
    jobs = [];
    events = [];
    workers = [];
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <DashboardClient
        supabaseConfig={supabaseConfig}
        initialJobs={jobs}
        initialEvents={events}
        initialWorkers={workers}
      />
    </main>
  );
}
