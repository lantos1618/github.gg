import { createHmac } from 'node:crypto';
import { afterAll, beforeEach, expect, mock, test } from 'bun:test';

const previousSecret = process.env.GITHUB_WEBHOOK_SECRET;
const secret = 'github-webhook-retry-test-secret';
process.env.GITHUB_WEBHOOK_SECRET = secret;

let queueAvailable = false;
let marked = false;
const operations: string[] = [];
const enqueueWebhookEvent = mock(async () => {
  operations.push('enqueue');
  return queueAvailable;
});
const wasWebhookProcessed = mock(async () => marked);
const markWebhookProcessed = mock(async () => {
  operations.push('mark');
  marked = true;
  return true;
});
const checkWebhookRateLimit = mock(async () => ({
  success: true,
  limit: 100,
  remaining: 99,
  reset: Date.now() + 60_000,
}));

mock.module('../src/lib/webhook-queue', () => ({ enqueueWebhookEvent }));
mock.module('../src/lib/webhook-dedup', () => ({ wasWebhookProcessed, markWebhookProcessed }));
mock.module('../src/lib/rate-limit', () => ({ checkWebhookRateLimit }));
mock.module('../src/lib/logging', () => ({
  createLogger: () => ({ info() {}, warn() {}, error() {}, debug() {} }),
}));

const { POST } = await import('../src/app/api/webhooks/github/route');
const payload = JSON.stringify({ installation: { id: 123 }, action: 'created' });
const signature = `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
const request = () => new Request('https://www.github.gg/api/webhooks/github', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-github-event': 'installation',
    'x-github-delivery': 'delivery-retry-test',
    'x-hub-signature-256': signature,
  },
  body: payload,
});

beforeEach(() => {
  queueAvailable = false;
  marked = false;
  operations.length = 0;
  enqueueWebhookEvent.mockClear();
  wasWebhookProcessed.mockClear();
  markWebhookProcessed.mockClear();
  checkWebhookRateLimit.mockClear();
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.GITHUB_WEBHOOK_SECRET;
  else process.env.GITHUB_WEBHOOK_SECRET = previousSecret;
});

test('a failed enqueue is retryable; only a successful enqueue deduplicates delivery', async () => {
  const failed = await POST(request());
  expect(failed.status).toBe(500);
  expect(operations).toEqual(['enqueue']);
  expect(markWebhookProcessed).not.toHaveBeenCalled();

  queueAvailable = true;
  const retried = await POST(request());
  expect(retried.status).toBe(202);
  expect(operations).toEqual(['enqueue', 'enqueue', 'mark']);
  expect(enqueueWebhookEvent).toHaveBeenCalledTimes(2);

  const duplicate = await POST(request());
  expect(duplicate.status).toBe(200);
  expect(await duplicate.json()).toEqual({ queued: false, duplicate: true, deliveryId: 'delivery-retry-test' });
  expect(enqueueWebhookEvent).toHaveBeenCalledTimes(2);
  expect(checkWebhookRateLimit).toHaveBeenCalledWith('github:installation:123');
});

test('an unavailable REST limiter does not drop a verified delivery', async () => {
  checkWebhookRateLimit.mockRejectedValueOnce(new Error('REST Redis unavailable'));
  queueAvailable = true;

  const response = await POST(request());

  expect(response.status).toBe(202);
  expect(enqueueWebhookEvent).toHaveBeenCalledTimes(1);
  expect(markWebhookProcessed).toHaveBeenCalledTimes(1);
});

test('an over-limit installation is rejected before enqueue', async () => {
  checkWebhookRateLimit.mockResolvedValueOnce({
    success: false,
    limit: 100,
    remaining: 0,
    reset: Date.now() + 60_000,
  });
  queueAvailable = true;

  const response = await POST(request());

  expect(response.status).toBe(429);
  expect(enqueueWebhookEvent).not.toHaveBeenCalled();
  expect(markWebhookProcessed).not.toHaveBeenCalled();
});

test('an invalid signature never reaches the shared limiter', async () => {
  const unsigned = request();
  unsigned.headers.set('x-hub-signature-256', 'sha256=invalid');

  const response = await POST(unsigned);

  expect(response.status).toBe(401);
  expect(checkWebhookRateLimit).not.toHaveBeenCalled();
  expect(enqueueWebhookEvent).not.toHaveBeenCalled();
});
