# Supabase Job Queue Demo (Next.js + Worker + GHCR + Coolify)

This project is a production-style queue demo:

- A Next.js dashboard enqueues and visualizes jobs.
- A separate worker process claims and processes jobs.
- Supabase stores queue data, events, and worker heartbeats.
- GitHub Actions builds and pushes Docker images to GHCR.
- Coolify deploys by image URL only.

## Architecture

- **Web app**: Next.js App Router UI + Server Actions.
- **Worker**: dedicated Node process in `worker/`, not bundled into the web app.
- **Database**: Supabase Postgres with RLS + `claim_next_job` RPC.
- **Realtime**: dashboard subscribes to `jobs`, `job_events`, and `worker_heartbeats`.

## 1) Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run:
   - `sql/schema.sql` (simple copy/paste option), or
   - `supabase/migrations/001_job_queue.sql` (migration file variant).
3. Confirm tables exist: `jobs`, `job_events`, `worker_heartbeats`.
4. Confirm function exists: `claim_next_job(worker_name text)`.

## 2) Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in real values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (worker/runtime URL, usually same as `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional worker tuning:
  - `WORKER_ID`
  - `POLL_INTERVAL_MS`
  - `SIMULATION_STEP_MS`

## 3) Local development

Install root dependencies:

```bash
npm install
```

Install worker dependencies:

```bash
npm install --prefix worker
```

Run web + worker together:

```bash
npm run dev:all
```

Or run separately:

```bash
npm run dev
npm run dev:worker
```

Dashboard URL: [http://localhost:3000](http://localhost:3000)

Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 4) Queue behavior

- New jobs are inserted as `pending`.
- Worker claims jobs with `claim_next_job` (safe with `FOR UPDATE SKIP LOCKED`).
- Worker simulates multiple steps and writes:
  - job progress (`25 -> 50 -> 75 -> 100`)
  - timeline events (`job_events`)
  - final `completed` result JSON or `failed` error.
- Dashboard updates through Realtime and falls back to polling when needed.

## 5) Docker images

### Web image

- Dockerfile: `Dockerfile`
- Output mode: Next.js standalone (`next.config.ts`).

Build locally:

```bash
docker build -t worker-test-nextjs-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  .
```

### Worker image

- Dockerfile: `worker/Dockerfile`

Build locally:

```bash
docker build -t worker-test-nextjs-worker -f worker/Dockerfile worker
```

## 6) GitHub Actions -> GHCR

Workflow file: `.github/workflows/publish-images.yml`

It publishes:

- `ghcr.io/sidmazak/worker-test-nextjs-web:latest`
- `ghcr.io/sidmazak/worker-test-nextjs-worker:latest`

and SHA tags for each image.

### Required GitHub configuration

- **Repository Variable**
  - `NEXT_PUBLIC_SUPABASE_URL`
- **Repository Secret**
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `COOLIFY_API_TOKEN` (required if Coolify deploy webhook says auth required)
  - `COOLIFY_WEB_DEPLOY_WEBHOOK_URL` (optional but recommended for immediate web deploy trigger)
  - `COOLIFY_WORKER_DEPLOY_WEBHOOK_URL` (optional but recommended for immediate worker deploy trigger)

`GITHUB_TOKEN` is used automatically for GHCR login/push.

### Auto deploy behavior

- If `COOLIFY_WEB_DEPLOY_WEBHOOK_URL` and/or `COOLIFY_WORKER_DEPLOY_WEBHOOK_URL` are set, GitHub Actions calls them after each image push.
- If your webhook requires auth, `COOLIFY_API_TOKEN` is sent as `Authorization: Bearer ...`.
- This gives you an immediate deployment trigger from CI.
- Keep Coolify image auto-update/watch enabled as a fallback safety mechanism.

### Changing `sidmazak` later

Edit this line in `.github/workflows/publish-images.yml`:

```yaml
env:
  IMAGE_PREFIX: ghcr.io/sidmazak
```

Then update image links in Coolify to match the new owner/org.

## 7) Coolify deployment (image URL only)

Create **two services** in Coolify:

### Service A: Web

- Image: `ghcr.io/sidmazak/worker-test-nextjs-web:latest`
- Port: `3000`
- Health check path: `/api/health`
- Env vars (set on the **running** Coolify service — read at request time by the server):
  - `NEXT_PUBLIC_SUPABASE_URL` (no trailing slash required; it is trimmed)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `PORT=3000`
  - `HOSTNAME=0.0.0.0`

### Service B: Worker

- Image: `ghcr.io/sidmazak/worker-test-nextjs-worker:latest`
- No public domain needed
- Replicas: `1` for demo (can scale up later)
- Env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `WORKER_ID`
  - `POLL_INTERVAL_MS`
  - `SIMULATION_STEP_MS`

### Private GHCR package note

If package visibility is private, configure a GHCR registry credential in Coolify with a GitHub PAT that has `read:packages`.

### Optional: deploy via Compose in Coolify

If you prefer a Compose-based Coolify app instead of two image services, use `docker-compose.coolify.yml`.
Coolify can auto-redeploy the compose app on Git changes, while images still come from GHCR.

## 8) Troubleshooting

- **Worker offline**
  - Check `worker_heartbeats.last_seen_at`.
  - Verify worker service env vars and logs.
- **RLS errors**
  - Re-run `sql/schema.sql` to ensure policies and grants exist.
- **No Realtime updates / banner says unavailable**
  - **GitHub Actions secrets do not control browser Realtime.** Realtime is opened from the user’s browser to your Supabase URL (`NEXT_PUBLIC_SUPABASE_URL` on the **Coolify web** service).
  - Confirm publication includes `jobs`, `job_events`, `worker_heartbeats` (run `sql/schema.sql`).
  - Self-hosted Supabase (`supatest.serveriko.com`): Kong/proxy must forward **WebSocket** to the Realtime service (`/realtime/v1/websocket`). If only REST works, the dashboard still updates every 5s via polling.
  - In browser DevTools → Network → WS, check for failed websocket to your Supabase host.
- **Worker Coolify settings**
  - Worker is a background process (no HTTP). You do **not** need a public domain or port `80`/`3000` on the worker service.
  - Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_ID` (optional timing vars). `SUPABASE_ANON_KEY` is not used by the worker code.
