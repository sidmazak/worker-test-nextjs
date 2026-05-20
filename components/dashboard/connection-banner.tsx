type RealtimeStatus = "connecting" | "connected" | "polling";

type ConnectionBannerProps = {
  configured: boolean;
  realtimeStatus: RealtimeStatus;
  realtimeError?: string | null;
  supabaseHost?: string;
};

const statusCopy: Record<
  RealtimeStatus,
  { className: string; message: string }
> = {
  connecting: {
    className: "border-sky-500/40 bg-sky-500/10 text-sky-200",
    message: "Connecting to Supabase Realtime…",
  },
  connected: {
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    message: "Realtime connected — live queue updates are on.",
  },
  polling: {
    className: "border-zinc-700 bg-zinc-900 text-zinc-300",
    message:
      "Realtime unavailable — dashboard refreshes every 5 seconds (data still updates).",
  },
};

export function ConnectionBanner({
  configured,
  realtimeStatus,
  realtimeError,
  supabaseHost,
}: ConnectionBannerProps) {
  if (!configured) {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        Missing Supabase env values. Add `NEXT_PUBLIC_SUPABASE_URL` and
        `NEXT_PUBLIC_SUPABASE_ANON_KEY` to run the dashboard.
      </div>
    );
  }

  const { className, message } = statusCopy[realtimeStatus];

  return (
    <div className={`rounded-lg border p-3 text-sm ${className}`}>
      <p>{message}</p>
      {realtimeStatus === "polling" && supabaseHost ? (
        <p className="mt-2 text-xs opacity-80">
          Host: {supabaseHost} — browser needs WebSocket to{" "}
          <code className="font-mono">wss://…/realtime/v1/websocket</code>
        </p>
      ) : null}
      {realtimeStatus === "polling" && realtimeError ? (
        <p className="mt-1 text-xs opacity-80">Detail: {realtimeError}</p>
      ) : null}
    </div>
  );
}
