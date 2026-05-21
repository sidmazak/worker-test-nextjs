# Coolify + Supabase + Worker Internal Network Setup

This document records the working setup we arrived at for making a worker and/or Next.js app talk to a Supabase instance internally inside Coolify.

## Goal

We wanted three things at the same time:

1. Host the worker or Next.js app in Coolify using a Docker image from GHCR.
2. Allow that service to reach Supabase over the internal Docker network.
3. Avoid relying on the public Supabase URL for server-side communication.

The important constraint was that the service we wanted to connect was **not exposing a public port requirement**. It only needed to make outbound HTTP requests to Supabase from inside the Docker environment.

---

## What finally worked

The setup that worked was:

- The worker or Next.js service was deployed in Coolify as a **Docker image resource** using the GHCR image.
- Supabase was deployed as its own Coolify service stack.
- The service that needed internal access had the **Connect to predefined network** option enabled when available, or was manually attached to the correct internal Docker network when the resource type did not expose that option.
- The Supabase URL used by the worker was the **internal Kong URL**, not the public domain.

In the working state, the internal URL format was:

```text
http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000
```

or, in the simplest local stack form inside the same compose network:

```text
http://supabase-kong:8000
```

The exact host depends on the Coolify networking model and the visible network scope of the container.

---

## Step-by-step process

### 1. Identify the three pieces

We had three separate resources in Coolify:

- A **Supabase stack**
- A **worker** container using a GHCR image
- A **Next.js** app, also hosted separately

The worker and Next.js app were not meant to run on the same Compose file as Supabase. They were meant to remain independently deployable.

---

### 2. Confirm the Supabase stack name and container layout

We inspected the running containers and found that the Supabase stack used a Coolify-generated stack/network suffix. One of the key containers was Kong:

- `supabase-kong-y3n3mj8jek44klup5jfoljqu`

That container was the gateway for Supabase HTTP traffic. Internally, Supabase services such as Studio and Edge Functions also referenced Kong at port `8000`.

This showed that the internal HTTP entry point for Supabase was Kong, not a random public domain.

---

### 3. Confirm the worker runtime type

The worker was not running as a monolithic Compose service inside the Supabase stack. It was running as a separate Coolify resource backed by a GHCR image.

The worker Docker image looked like this:

```dockerfile
FROM node:24-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
CMD ["node", "dist/index.js"]
```

That image was stored in GHCR and deployed in Coolify as a Docker image resource.

---

### 4. Verify the internal networking situation

We used Docker commands on the server to inspect container networks.

A useful command was:

```bash
docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Networks}}'
```

This showed which containers were on which Docker networks.

We learned that:

- Supabase containers were attached to the Supabase stack network.
- The worker container was attached to its own service network and also to `shared-internal`.
- The Supabase Kong container was also attached to `shared-internal`.

This explained why the worker could communicate once the correct hostname was used.

---

### 5. Test DNS resolution from inside the worker

We installed `curl` in the worker container temporarily using Alpine’s package manager:

```sh
apk add --no-cache curl
```

Then we tested the internal Supabase endpoint:

```sh
curl http://supabase-kong:8000/health
```

At first, this returned DNS resolution failures when the worker was not on the right network.

Later, after the network situation was corrected, the same request returned:

```json
{"message":"Unauthorized"}
```

That was a good sign. It meant:

- the worker could resolve the internal host
- the worker could reach the Supabase Kong service
- the HTTP path was correct
- the only missing piece was authentication headers or keys

---

### 6. Understand the network rule in Coolify

The key rule we established was:

- Any service that wants to connect to the internal shared network should have the **Connect to predefined network** option enabled when Coolify exposes it.
- If the resource type is a service stack, that is the proper Coolify-native way to join the shared network.
- If the resource type is only a Docker image resource and does not expose that option, you may need to rely on the existing shared network or a manual Docker network attachment, but that is not the clean permanent solution.

This is the main networking principle that drove the final setup.

---

## The recommended deployment pattern

### Worker and Next.js

The worker or Next.js service should be hosted through a **Docker Compose entry** using the GHCR image.

That means the service definition should look conceptually like this:

```yaml
services:
  worker:
    image: ghcr.io/sidmazak/worker-test-nextjs-worker:latest
    restart: unless-stopped
    environment:
      SUPABASE_URL: http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000
      SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY}
      WORKER_ID: ${WORKER_ID}
      POLL_INTERVAL_MS: ${POLL_INTERVAL_MS}
      SIMULATION_STEP_MS: ${SIMULATION_STEP_MS}
```

If the same pattern is used for Next.js, it should be deployed the same way as a separate GHCR-backed Docker Compose service.

---

### Shared network requirement

Any service that wants to connect to the internal shared network should have:

- the correct Coolify destination selected
- the **Connect to predefined network** option enabled if the resource type exposes it

This is the setting that tells Coolify to place the service into the network path that allows internal name resolution.

---

## The final internal URL format

This was the most important practical detail.

### Correct internal URL

Use the internal Kong endpoint:

```text
http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000
```

### What it means

- `supabase-kong` is the internal Supabase gateway service.
- `y3n3mj8jek44klup5jfoljqu` is the Coolify-generated stack/network suffix.
- `8000` is the Kong HTTP port.

### Why this matters

The worker should not use the public Supabase domain for internal server-to-server traffic if it can use the internal Docker network instead.

---

## How we verified it worked

We confirmed it by running the following inside the worker container:

```sh
apk add --no-cache curl
curl http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000/health
```

The important result was not a perfect success response. The important result was that the request reached Kong.

If the request got a response such as:

```json
{"message":"Unauthorized"}
```

that meant the network path was correct and the remaining issue was authentication, not connectivity.

---

## What to put in the worker environment

For internal access, the worker should use environment variables like these:

```env
SUPABASE_URL=http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
WORKER_ID=your_worker_id
POLL_INTERVAL_MS=your_poll_interval
SIMULATION_STEP_MS=your_step_interval
```

If the worker only needs public or limited access, an anon key may be used instead of the service role key. For backend worker processes, the service role key is usually the more common choice.

---

## What could change later

There are two kinds of changes to be aware of.

### Safe changes

These usually do not break the working setup:

- redeploying the worker
- redeploying Next.js
- restarting containers
- updating the Supabase image version inside the same resource
- changing environment variables

### Riskier changes

These may change the internal hostname:

- deleting and recreating the Supabase resource
- cloning the resource into a new Coolify service
- moving the service to a new stack identity
- replacing the resource in a way that changes the Coolify suffix

If that happens, the worker’s `SUPABASE_URL` must be updated to the new internal host.

---

## Final rule set

1. Host the worker or Next.js service in Coolify using the GHCR image through a Docker Compose or Coolify service setup.
2. Enable **Connect to predefined network** for any service that must participate in the internal shared network, when that option is available.
3. Use the internal Supabase Kong URL, not the public URL, for server-side communication.
4. The URL format that worked is:

```text
http://supabase-kong-y3n3mj8jek44klup5jfoljqu:8000
```

5. Verify by running `curl` from inside the worker container and confirming that the request reaches Kong.

---

## Short operational summary

- **Worker/Next.js**: deploy as GHCR-backed Docker Compose services.
- **Internal networking**: enable Coolify’s predefined network option when applicable.
- **Supabase internal URL**: use the Kong host with the Coolify suffix and port `8000`.
- **Validation**: `curl` from inside the worker should reach Kong and return an HTTP response, even if unauthorized.

