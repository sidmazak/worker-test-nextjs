import type { Job } from "@/lib/types/database";

type StatsCardsProps = {
  jobs: Job[];
};

function countByStatus(jobs: Job[], status: Job["status"]) {
  return jobs.filter((job) => job.status === status).length;
}

export function StatsCards({ jobs }: StatsCardsProps) {
  const stats = [
    { label: "Pending", value: countByStatus(jobs, "pending") },
    { label: "Processing", value: countByStatus(jobs, "processing") },
    { label: "Completed", value: countByStatus(jobs, "completed") },
    { label: "Failed", value: countByStatus(jobs, "failed") },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <p className="text-sm text-zinc-400">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">{item.value}</p>
        </div>
      ))}
    </section>
  );
}
