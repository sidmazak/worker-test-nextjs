type ConnectionBannerProps = {
  configured: boolean;
  realtimeConnected: boolean;
};

export function ConnectionBanner({
  configured,
  realtimeConnected,
}: ConnectionBannerProps) {
  if (!configured) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        Missing Supabase env values. Add `NEXT_PUBLIC_SUPABASE_URL` and
        `NEXT_PUBLIC_SUPABASE_ANON_KEY` to run the dashboard.
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        realtimeConnected
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-zinc-700 bg-zinc-900 text-zinc-200"
      }`}
    >
      {realtimeConnected
        ? "Realtime connected: live queue updates are on."
        : "Realtime disconnected: using timed refresh fallback."}
    </div>
  );
}
