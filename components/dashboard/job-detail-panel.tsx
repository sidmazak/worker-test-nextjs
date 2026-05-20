import type { Job, JobEvent } from "@/lib/types/database";

type JobDetailPanelProps = {
  job: Job | null;
  events: JobEvent[];
};

export function JobDetailPanel({ job, events }: JobDetailPanelProps) {
  if (!job) {
    return (
      <aside className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        Select a job to inspect timeline and result payload.
      </aside>
    );
  }

  const relatedEvents = events
    .filter((event) => event.job_id === job.id)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  return (
    <aside className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Job Detail</h2>
        <p className="mt-1 text-xs text-zinc-400">{job.id}</p>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Timeline
        </h3>
        <div className="space-y-2">
          {relatedEvents.length > 0 ? (
            relatedEvents.map((event) => (
              <div key={event.id} className="rounded-md border border-zinc-800 p-2">
                <p className="text-xs font-medium text-zinc-200">{event.step}</p>
                <p className="text-xs text-zinc-400">{event.message}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {new Date(event.created_at).toLocaleTimeString()}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-zinc-500">No events recorded yet.</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Result JSON
        </h3>
        <pre className="max-h-56 overflow-auto rounded-md bg-zinc-950 p-3 text-xs text-zinc-200">
          {JSON.stringify(
            {
              status: job.status,
              progress: job.progress,
              error: job.error,
              result: job.result,
            },
            null,
            2
          )}
        </pre>
      </div>
    </aside>
  );
}
