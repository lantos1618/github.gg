/**
 * BullMQ worker entry point — drains the github-webhooks queue.
 *
 * Run with:   bun run worker:webhook
 *
 * This process runs as a Vercel Daemon or another long-running service.
 * Vercel Functions cannot host a persistent BullMQ consumer. See
 * WORKER_DEPLOYMENT.md for deployment and activation steps.
 *
 * The worker:
 *   - Subscribes to WEBHOOK_QUEUE_NAME
 *   - Renews its 60s BullMQ job lock while an active handler runs
 *   - Lets BullMQ handle exponential backoff retries (see DEFAULT_WEBHOOK_JOB_OPTS)
 *   - Logs every job lifecycle event so we can diagnose timeouts/retries
 */
import { Worker, type WorkerOptions } from 'bullmq';
import {
  WEBHOOK_QUEUE_NAME,
  getWebhookRedisConnection,
  type WebhookJobData,
} from '@/lib/webhook-queue';
import { dispatchWebhookEvent } from '@/lib/webhook-handlers';
import { createLogger } from '@/lib/logging';

const logger = createLogger('WebhookWorker');

const JOB_LOCK_DURATION_MS = 60_000;

function startWorker(): Worker<WebhookJobData> {
  const connection = getWebhookRedisConnection();
  if (!connection) {
    logger.error('REDIS_URL not set — worker cannot start', undefined);
    throw new Error('REDIS_URL is required to run the webhook worker');
  }

  const options: WorkerOptions = {
    connection,
    concurrency: 5,
    // BullMQ uses Redis BRPOPLPUSH with this drain delay when the queue is
    // empty. 5s is the default — leaving explicit so it's discoverable.
    lockDuration: JOB_LOCK_DURATION_MS,
  };

  const worker = new Worker<WebhookJobData>(
    WEBHOOK_QUEUE_NAME,
    async (job) => {
      const { deliveryId, eventName, payload } = job.data;
      logger.info('Processing webhook job', {
        jobId: job.id,
        deliveryId,
        eventName,
        attempt: job.attemptsMade + 1,
      });

      // A Promise.race timeout would reject the BullMQ job while dispatch
      // keeps running, so its retry could overlap the original side effects.
      // BullMQ renews the lock for a live processor and retries genuine
      // failures or interrupted processes instead.
      await dispatchWebhookEvent({ deliveryId, eventName, payload });

      logger.info('Webhook job complete', {
        jobId: job.id,
        deliveryId,
        eventName,
      });
    },
    options,
  );

  worker.on('completed', (job) => {
    logger.info('Job completed', {
      jobId: job.id,
      eventName: job.data.eventName,
      durationMs: job.processedOn && job.finishedOn ? job.finishedOn - job.processedOn : null,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', err, {
      jobId: job?.id,
      eventName: job?.data?.eventName,
      attempt: job?.attemptsMade,
      willRetry: job ? job.attemptsMade < (job.opts.attempts ?? 1) : false,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', err);
  });

  worker.on('ready', () => {
    logger.info('Webhook worker ready', {
      queue: WEBHOOK_QUEUE_NAME,
      concurrency: options.concurrency,
    });
  });

  return worker;
}

// Graceful shutdown — let in-flight jobs drain before exiting so we don't
// trigger a spurious retry on a job that was 90% done.
async function shutdown(worker: Worker<WebhookJobData>, signal: string): Promise<void> {
  logger.info('Shutting down worker', { signal });
  try {
    await worker.close();
    logger.info('Worker shut down cleanly');
    process.exit(0);
  } catch (err) {
    logger.error('Error during worker shutdown', err);
    process.exit(1);
  }
}

// Entry — only invoke when run directly (NOT when imported by tests).
// `import.meta.main` is bun-specific but our `worker:webhook` script uses bun.
if (import.meta.main) {
  const worker = startWorker();
  process.on('SIGTERM', () => void shutdown(worker, 'SIGTERM'));
  process.on('SIGINT', () => void shutdown(worker, 'SIGINT'));
}

export { startWorker };
