import crypto from 'crypto';

interface AnalysisJob {
  user: string;
  repo: string;
  ref?: string;
  filePaths: string[];
  userId: string;
  createdAt: number;
}

// In-memory job store with 5-minute TTL
// Jobs are created via POST mutation, consumed by SSE subscription
const jobs = new Map<string, AnalysisJob>();

const TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean expired jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) {
      jobs.delete(id);
    }
  }
}, 60 * 1000); // Cleanup every minute

export function createJob(params: Omit<AnalysisJob, 'createdAt'>): string {
  const jobId = crypto.randomBytes(16).toString('hex');
  jobs.set(jobId, { ...params, createdAt: Date.now() });
  return jobId;
}

export function consumeJob(jobId: string, userId: string): AnalysisJob | null {
  const job = jobs.get(jobId);
  if (!job) return null;
  if (job.userId !== userId) return null; // Only the creator can consume
  if (Date.now() - job.createdAt > TTL_MS) {
    jobs.delete(jobId);
    return null;
  }
  jobs.delete(jobId); // One-time use
  return job;
}
