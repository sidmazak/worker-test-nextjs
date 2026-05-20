"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PublicSupabaseConfig } from "@/lib/supabase/env";
import type { Job, JobEvent, WorkerHeartbeat } from "@/lib/types/database";
import { ConnectionBanner } from "@/components/dashboard/connection-banner";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SubmitJobForm } from "@/components/dashboard/submit-job-form";
import { JobTable } from "@/components/dashboard/job-table";
import { JobDetailPanel } from "@/components/dashboard/job-detail-panel";
import { WorkerStatus } from "@/components/dashboard/worker-status";

type DashboardClientProps = {
  supabaseConfig: PublicSupabaseConfig | null;
  initialJobs: Job[];
  initialEvents: JobEvent[];
  initialWorkers: WorkerHeartbeat[];
};

export function DashboardClient({
  supabaseConfig,
  initialJobs,
  initialEvents,
  initialWorkers,
}: DashboardClientProps) {
  const [jobs, setJobs] = useState(initialJobs);
  const [events, setEvents] = useState(initialEvents);
  const [workers, setWorkers] = useState(initialWorkers);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(
    initialJobs[0]?.id ?? null
  );
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  const configured = supabaseConfig !== null;

  const refreshData = useCallback(async () => {
    if (!supabaseConfig) {
      return;
    }

    const supabase = createSupabaseBrowserClient(supabaseConfig);
    const [{ data: jobsData }, { data: eventsData }, { data: workersData }] =
      await Promise.all([
        supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("job_events").select("*").order("created_at", { ascending: false }).limit(250),
        supabase
          .from("worker_heartbeats")
          .select("*")
          .order("last_seen_at", { ascending: false })
          .limit(10),
      ]);
    setJobs(jobsData ?? []);
    setEvents(eventsData ?? []);
    setWorkers(workersData ?? []);
  }, [supabaseConfig]);

  useEffect(() => {
    if (!supabaseConfig) {
      return;
    }

    const supabase = createSupabaseBrowserClient(supabaseConfig);
    const channel = supabase
      .channel("queue-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => void refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_events" },
        () => void refreshData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "worker_heartbeats" },
        () => void refreshData()
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    const polling = window.setInterval(() => {
      if (!realtimeConnected) {
        void refreshData();
      }
    }, 5000);

    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [supabaseConfig, realtimeConnected, refreshData]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-100">
          Supabase Queue Dashboard
        </h1>
        <p className="text-sm text-zinc-400">
          Submit jobs, watch worker progress, and inspect each processing step in
          real time.
        </p>
      </header>

      <ConnectionBanner
        configured={configured}
        realtimeConnected={realtimeConnected}
      />
      <StatsCards jobs={jobs} />

      <section className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-3">
          <SubmitJobForm onSubmitted={() => void refreshData()} />
          <WorkerStatus workers={workers} />
        </div>
        <div className="space-y-4 lg:col-span-6">
          <JobTable
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            onRetried={() => void refreshData()}
          />
        </div>
        <div className="lg:col-span-3">
          <JobDetailPanel job={selectedJob} events={events} />
        </div>
      </section>
    </div>
  );
}
