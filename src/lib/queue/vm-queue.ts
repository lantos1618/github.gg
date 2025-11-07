import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Job types
export interface ProvisionVMJob {
  environmentId: string;
  userId: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  initScript?: string;
  environmentVars?: Record<string, string>;
}

export interface StartVMJob {
  environmentId: string;
}

export interface StopVMJob {
  environmentId: string;
}

export interface DestroyVMJob {
  environmentId: string;
}

// Create queues
export const vmProvisionQueue = new Queue<ProvisionVMJob>('vm-provision', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const vmControlQueue = new Queue<StartVMJob | StopVMJob | DestroyVMJob>('vm-control', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 50,
    removeOnFail: 50,
  },
});

// Helper to add provisioning job
export async function queueProvisionJob(job: ProvisionVMJob) {
  return await vmProvisionQueue.add('provision', job, {
    jobId: `provision-${job.environmentId}`,
  });
}

// Helper to add control jobs
export async function queueStartJob(environmentId: string) {
  return await vmControlQueue.add('start', { environmentId }, {
    jobId: `start-${environmentId}`,
  });
}

export async function queueStopJob(environmentId: string) {
  return await vmControlQueue.add('stop', { environmentId }, {
    jobId: `stop-${environmentId}`,
  });
}

export async function queueDestroyJob(environmentId: string) {
  return await vmControlQueue.add('destroy', { environmentId }, {
    jobId: `destroy-${environmentId}`,
  });
}

// Export connection for workers
export { connection as redisConnection };
