"use client";

import { retryJob } from "@/app/actions/jobs";
import type { Job } from "@/lib/types/database";

type JobTableProps = {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onRetried: () => void;
};

const statusColors: Record<Job["status"], string> = {
  pending: "bg-amber-500/20 text-amber-200",
  processing: "bg-sky-500/20 text-sky-200",
  completed: "bg-emerald-500/20 text-emerald-200",
  failed: "bg-rose-500/20 text-rose-200",
};

export function JobTable({
  jobs,
  selectedJobId,
  onSelectJob,
  onRetried,
}: JobTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-800 text-zinc-400">
          <tr>
            <th className="px-4 py-3 font-medium">Job</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Progress</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className={`cursor-pointer border-b border-zinc-800/70 text-zinc-200 transition hover:bg-zinc-800/30 ${
                selectedJobId === job.id ? "bg-zinc-800/40" : ""
              }`}
            >
              <td className="px-4 py-3">
                <p className="font-medium">{job.title}</p>
                <p className="text-xs text-zinc-500">{job.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusColors[job.status]}`}
                >
                  {job.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="h-2 w-full rounded bg-zinc-800">
                  <div
                    className="h-full rounded bg-zinc-200"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {new Date(job.updated_at).toLocaleTimeString()}
              </td>
              <td className="px-4 py-3 text-right">
                {job.status === "failed" ? (
                  <form
                    action={async (formData) => {
                      await retryJob(formData);
                      onRetried();
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="inline"
                  >
                    <input type="hidden" name="jobId" value={job.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-600 px-2 py-1 text-xs hover:border-zinc-400"
                    >
                      Retry
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-zinc-600">-</span>
                )}
              </td>
            </tr>
          ))}
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                No jobs yet. Submit one to start the queue.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
