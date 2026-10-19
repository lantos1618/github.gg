# GitHub webhook worker deployment

`src/workers/webhook-worker.ts` is a persistent BullMQ consumer for the
`github-webhooks` Redis queue. The `github.gg` Vercel project uses the repository
root as its Root Directory, so it can run this worker as a Vercel Daemon next to
the Next.js app. Its image is built from the root `Dockerfile`.

## Current state

`vercel.json` declares one `webhook-worker` daemon in `iad1` with **zero
instances**. A production deployment can build its image, but will not start a
worker or consume queued jobs. Keep the count at zero until the production
credentials and queue have been checked.

Daemons currently run only for production deployments; preview deployments and
`vercel dev` do not run them. Vercel restarts crashed instances, collects their
stdout/stderr in project Logs (source `daemon`), and sends `SIGTERM` on rollout.
The worker closes its BullMQ connection and drains in-flight jobs on shutdown.

## Production prerequisites

Set these in the `github.gg` Vercel project's **Production** environment:

| Variable | Purpose |
| --- | --- |
| `REDIS_URL` | Redis TCP connection shared by the webhook receiver and BullMQ worker. Upstash REST variables alone do not work for BullMQ. |
| `DATABASE_URL` | Neon database connection shared with the web app. |
| `GITHUB_APP_ID` and `GITHUB_PRIVATE_KEY` | GitHub App installation authentication for repository access and comments. Use the exact Vercel variable name `GITHUB_PRIVATE_KEY`. |
| `API_KEY_ENCRYPTION_SECRET` | Decrypt subscribers' saved Gemini keys for BYOK analysis. |
| `GEMINI_API_KEY` | Platform Gemini key for users without a saved BYOK key. |
| `GITHUB_WEBHOOK_SECRET` | Used by the **webhook receiver** to verify GitHub signatures before enqueueing; the worker does not read it. |

The GitHub App webhook URL must point to
`https://www.github.gg/api/webhooks/github` and use the same
`GITHUB_WEBHOOK_SECRET`. Confirm the App is installed on the intended
repositories and the receiver can enqueue a signed test delivery before
starting the worker. Keep all credentials out of Git and Docker images.

## Build and activate

To verify the image locally (with an appropriate local `.env.local`):

```bash
docker build -t github-gg-webhook-worker .
docker run --rm --env-file .env.local github-gg-webhook-worker
```

The image runs `bun src/workers/webhook-worker.ts`; Vercel injects its
Production environment variables, so the container does not require an
`.env.local` file in production.

Once the production prerequisites pass, change
`daemons.webhook-worker.instances.iad1` from `0` to `1` and deploy to
Production, or use the project's Daemons dashboard to scale to one instance.
Dashboard scaling creates an override that persists across deployments until
cleared; check for an override before assuming the repository value controls
the running instance count. Watch the daemon logs for `Webhook worker ready`
and confirm a new GitHub delivery leaves the BullMQ `waiting` state. Scale
back to zero if processing fails.

The daemon requests 1 GiB of memory and gives the worker 120 seconds to drain
after `SIGTERM`. Vercel Daemons are in public beta and available on all plans.
Hobby has a shared 10 Active CPU-hour monthly daemon quota; reaching it stops
the team's daemons until the next month or a Pro upgrade. Pro use is metered
for provisioned memory and active CPU. Check current Vercel Usage and the
[regional price table](https://vercel.com/docs/pricing/regional-pricing/iad1)
before scaling above zero.

## Running locally without Docker

```bash
bun install --frozen-lockfile
bun run worker:webhook
```

`worker:webhook` loads `.env.local`. If `REDIS_URL` is absent, the worker exits
with a clear error.

## Monitoring and failure modes

BullMQ retains up to 1,000 completed jobs for one hour and 1,000 failed jobs
for 24 hours; see `DEFAULT_WEBHOOK_JOB_OPTS` in
`src/lib/webhook-queue.ts`. Vercel project Logs show daemon lifecycle and job
errors. The Redis queue should be monitored separately for waiting and failed
jobs.

| Symptom | Likely cause |
| --- | --- |
| GitHub webhook returns 500 | Redis is unavailable to the receiver; restore Redis and redeliver the failed event from GitHub if it is not retried automatically. |
| Jobs remain in `waiting` | Daemon has zero instances, has stopped, or cannot connect to Redis. |
| Private repository jobs fail | GitHub App PEM, App ID, or installation access is missing. |
| BYOK jobs fail to decrypt a stored key | `API_KEY_ENCRYPTION_SECRET` is missing or differs from the key used to encrypt it. |

See [Vercel Daemons](https://vercel.com/docs/daemons), its
[configuration reference](https://vercel.com/docs/daemons/config-reference),
and [limits](https://vercel.com/docs/daemons/limits) for current beta behavior.
