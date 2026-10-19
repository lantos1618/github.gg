import { expect, test } from 'bun:test';
import { createJob, consumeJob } from '../src/lib/analysis/job-store';

const jobParams = {
  user: 'demo',
  repo: 'repo',
  filePaths: ['src/index.ts'],
  userId: 'owner',
};

test('a job is claimed once, only by its owner, even with concurrent SSE requests', async () => {
  const jobId = await createJob(jobParams);
  expect(await consumeJob(jobId, 'another-user')).toBeNull();

  const claims = await Promise.all(
    Array.from({ length: 16 }, () => consumeJob(jobId, jobParams.userId)),
  );
  expect(claims.filter(Boolean)).toHaveLength(1);
  expect(claims.find(Boolean)).toMatchObject(jobParams);
  expect(await consumeJob(jobId, jobParams.userId)).toBeNull();
  expect(await consumeJob('invalid-job-id', jobParams.userId)).toBeNull();

  // The UI's Regenerate action creates a new job before reconnecting.
  const retryJobId = await createJob(jobParams);
  expect(retryJobId).not.toBe(jobId);
  expect(await consumeJob(retryJobId, jobParams.userId)).toMatchObject(jobParams);
});

test('production analysis jobs fail closed without Redis', () => {
  const program = `
    import { createJob, consumeJob } from './src/lib/analysis/job-store.ts';
    const params = { user: 'demo', repo: 'repo', filePaths: [], userId: 'owner' };
    const results = await Promise.allSettled([
      createJob(params),
      consumeJob('a'.repeat(32), 'owner'),
    ]);
    if (results.every(result => result.status === 'rejected' &&
      result.reason?.message === 'Analysis job storage is unavailable')) {
      process.exit(0);
    }
    process.exit(1);
  `;
  const result = Bun.spawnSync({
    cmd: [process.execPath, '-e', program],
    cwd: process.cwd(),
    env: { NODE_ENV: 'production', PATH: process.env.PATH || '' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  expect(result.exitCode).toBe(0);
});
