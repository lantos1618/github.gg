/**
 * GitHub webhook receiver — request path.
 *
 * Responsibilities (kept intentionally minimal):
 *   1. Verify the `x-hub-signature-256` HMAC.
 *   2. Rate-limit by installation ID (Path D from audit).
 *   3. Atomically dedup by `x-github-delivery` (Path R3).
 *   4. Enqueue the event onto BullMQ.
 *   5. Return 202 Accepted.
 *
 * The actual handler work — DB writes for installations, PR/commit/issue
 * analysis — runs in `src/workers/webhook-worker.ts`. See WORKER_DEPLOYMENT.md
 * for how to run that process.
 *
 * Why: Vercel serverless has a 30s hard cap. Neon HTTP latency + large repo
 * arrays on `installation.created` / `installation_repositories.added` could
 * push us past it. GitHub does NOT retry installation events, so any timeout
 * here meant a silently lost install.
 */
import { Webhooks } from '@octokit/webhooks';
import { createLogger } from '@/lib/logging';
import { checkGitHubWebhookRateLimit } from '@/lib/webhooks/rate-limiter';
import { markWebhookProcessed } from '@/lib/webhook-dedup';
import { enqueueWebhookEvent } from '@/lib/webhook-queue';

const logger = createLogger('GitHubWebhook');

// We use `@octokit/webhooks` for signature verification only — not for event
// dispatch, since that pulls in the slow synchronous handler-registration
// pattern that caused this bug in the first place.
const webhooks = process.env.GITHUB_WEBHOOK_SECRET
  ? new Webhooks({
      secret: process.env.GITHUB_WEBHOOK_SECRET,
    })
  : null;

export async function POST(request: Request) {
  const event = request.headers.get('x-github-event') ?? 'unknown';
  const delivery = request.headers.get('x-github-delivery') ?? 'unknown';

  logger.info('Incoming webhook:', {
    event,
    delivery,
    hasWebhookSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
    webhooksConfigured: !!webhooks,
    timestamp: new Date().toISOString(),
  });

  if (!webhooks) {
    logger.error('Webhooks not configured', undefined, {
      hasSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
      event,
      delivery,
    });
    return new Response('Webhooks not configured', { status: 503 });
  }

  let payload: string;
  try {
    payload = await request.text();
    logger.info('Payload received:', {
      event,
      delivery,
      payloadLength: payload.length,
    });
  } catch (error) {
    logger.error('Failed to read request body', error, { event, delivery });
    return new Response('Failed to read request body', { status: 400 });
  }

  const signature = request.headers.get('x-hub-signature-256');
  if (!signature) {
    logger.error('No signature found in webhook request', undefined, {
      event,
      delivery,
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
    });
    return new Response('No signature found', { status: 401 });
  }

  try {
    const verified = await webhooks.verify(payload, signature);
    if (!verified) {
      logger.error('Webhook signature verification failed', undefined, {
        event,
        delivery,
        signatureProvided: !!signature,
        hasSecret: !!process.env.GITHUB_WEBHOOK_SECRET,
      });
      return new Response('Signature verification failed', { status: 401 });
    }
    logger.info('Signature verified successfully:', { event, delivery });
  } catch (error) {
    logger.error('Webhook verification error', error, { event, delivery });
    return new Response('Signature verification failed', { status: 401 });
  }

  // Parse once — we need installationId for rate limiting and the full parsed
  // body for the queue payload.
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(payload);
  } catch (error) {
    logger.error('Failed to parse webhook payload as JSON', error, {
      event,
      delivery,
    });
    return new Response('Invalid JSON payload', { status: 400 });
  }

  // Rate limit by installation ID (after signature verification — we don't
  // want to expose the rate limiter to unauthenticated traffic).
  const installationId = (parsedPayload as { installation?: { id?: number } } | null)
    ?.installation?.id;
  if (installationId) {
    const { allowed } = checkGitHubWebhookRateLimit(installationId);
    if (!allowed) {
      logger.warn('Webhook rate limit exceeded', { event, delivery, installationId });
      return new Response('Rate limit exceeded', { status: 429 });
    }
  }

  // Delivery-ID dedup (audit R3). GitHub retries webhooks aggressively on any
  // hiccup; without this, every retry would re-enqueue the same job. The
  // BullMQ job ID is also the delivery ID, so this is belt-and-braces — but
  // we still want the early return to avoid even touching the queue on
  // duplicates. Synthetic 'unknown' deliveries (malformed requests) fall
  // through.
  if (delivery && delivery !== 'unknown') {
    const acquired = await markWebhookProcessed(delivery);
    if (!acquired) {
      logger.info('Duplicate webhook delivery — already processed', { event, delivery });
      return Response.json({ queued: false, duplicate: true, deliveryId: delivery }, { status: 200 });
    }
  }

  // Enqueue + 202. We deliberately do NOT await any DB work here — that's the
  // whole point of this refactor.
  const enqueued = await enqueueWebhookEvent(delivery, event, parsedPayload);
  if (!enqueued) {
    // The queue is unavailable (Redis down or REDIS_URL missing). Returning
    // 500 here makes GitHub retry, which is the right call — we don't want to
    // silently drop events when our queue is broken.
    logger.error('Failed to enqueue webhook — queue unavailable', undefined, {
      event,
      delivery,
    });
    return new Response('Queue unavailable', { status: 500 });
  }

  logger.info('Webhook enqueued:', {
    event,
    delivery,
    timestamp: new Date().toISOString(),
  });
  return Response.json(
    { queued: true, deliveryId: delivery },
    { status: 202 },
  );
}
