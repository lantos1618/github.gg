# Worker deployment

The webhook worker (`src/workers/webhook-worker.ts`) is a long-lived process
that drains the BullMQ `github-webhooks` queue. **Vercel cannot host it** —
Vercel functions are serverless and time out after at most 30s, which is
exactly the problem this worker exists to solve.

## TL;DR — recommended setup

Run the worker on **Railway** (or any small VM you already pay for —
OVH/Hetzner/Fly.io all work the same way).

```bash
bun install
bun run worker:webhook
```

Required environment variables:

| Var | Notes |
| --- | --- |
| `REDIS_URL`           | ioredis TCP URL. Vercel KV exposes this; copy from `vercel env pull`. |
| `DATABASE_URL`        | Same Neon URL the web app uses. |
| `GITHUB_APP_ID`       | Same as web app (needed for installation token minting). |
| `GITHUB_APP_PRIVATE_KEY` | Same as web app. |
| `GOOGLE_GENERATIVE_AI_API_KEY` | For the AI analysis handlers (PR / commit / issue). |
| `ENABLE_PR_REVIEWS`, `ENABLE_COMMIT_ANALYSIS`, etc. | Feature flags must match the web app or analysis silently no-ops. |

The worker doesn't need `GITHUB_WEBHOOK_SECRET` — signature verification
happens in the request path before the job is enqueued.

## Why Railway

- Native bun support (`nixpacks` autodetects `package.json`).
- One service per repo, point it at the `worker:webhook` script.
- Cheaper than Fly's smallest VM at the scale we need.
- Logs are queryable out of the box.

If you already have OVH/Hetzner credits, deploying as a systemd unit is
equivalent — no architectural difference.

## Alternative: Vercel Cron drain endpoint

Not currently implemented. The pattern would be:

1. Add `/api/cron/drain-webhooks` that pulls N jobs off the queue and processes
   them inline within Vercel's 30s budget.
2. Schedule it every 30s via `vercel.json`.

This avoids the extra infra but trades latency (up to 30s before a webhook is
processed) and is fragile under bursts. Only go this route if Railway/VM is
genuinely not an option.

## Running locally

```bash
# Terminal 1 — web app
bun run dev

# Terminal 2 — worker
bun run worker:webhook
```

Both processes share `.env.local`. If `REDIS_URL` isn't set the worker exits
on startup with a clear error.

## Monitoring

BullMQ keeps the last 1000 completed jobs (1h retention) and 1000 failed jobs
(24h retention) — see `DEFAULT_WEBHOOK_JOB_OPTS` in `src/lib/webhook-queue.ts`.
For a UI, install [`bull-board`](https://github.com/felixmosh/bull-board) and
mount it behind admin auth — it's the standard tool and we've used it before.

## Failure modes

| Symptom | Diagnosis |
| --- | --- |
| Webhooks return 500 from `/api/webhooks/github` | `REDIS_URL` missing or Redis unreachable. The request path treats an unavailable queue as a hard failure so GitHub retries. |
| Jobs sit in `waiting` indefinitely | Worker process is down. Restart `worker:webhook`. |
| Same delivery ID retried forever | A handler is throwing on a permanently malformed payload. Check failed jobs; if it's hopeless, manually remove the job via `bull-board` or `Queue.removeJobs()`. |
| `installation.created` events succeed but no DB rows | Worker has a stale `DATABASE_URL` — re-sync env. |
