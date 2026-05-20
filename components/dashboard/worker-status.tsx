import type { WorkerHeartbeat } from "@/lib/types/database";

type WorkerStatusProps = {
  workers: WorkerHeartbeat[];
};

function isOnline(lastSeenAt: string) {
  return Date.now() - new Date(lastSeenAt).getTime() < 15000;
}

export function WorkerStatus({ workers }: WorkerStatusProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <h2 className="text-sm font-semibold text-zinc-100">Worker Status</h2>
      <div className="mt-3 space-y-2">
        {workers.length > 0 ? (
          workers.map((worker) => (
            <div
              key={worker.worker_id}
              className="flex items-center justify-between rounded-md border border-zinc-800 p-2 text-sm"
            >
              <div>
                <p className="font-medium text-zinc-100">{worker.worker_id}</p>
                <p className="text-xs text-zinc-500">
                  Last seen {new Date(worker.last_seen_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-xs font-medium ${
                    isOnline(worker.last_seen_at)
                      ? "text-emerald-300"
                      : "text-zinc-500"
                  }`}
                >
                  {isOnline(worker.last_seen_at) ? "Online" : "Offline"}
                </p>
                <p className="text-xs text-zinc-500">
                  Jobs: {worker.jobs_processed}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500">No worker heartbeat yet.</p>
        )}
      </div>
    </section>
  );
}
