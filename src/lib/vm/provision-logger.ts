/**
 * Provision Logger
 * Stores provisioning logs in Redis for real-time streaming to the frontend
 */

import { redisConnection } from '@/lib/queue/vm-queue';
import Redis from 'ioredis';

const redis = new Redis(redisConnection);

const LOG_TTL = 3600; // Logs expire after 1 hour
const MAX_LOGS = 100; // Keep last 100 log lines

export interface ProvisionLog {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error' | 'debug';
}

/**
 * Add a log entry for a user's provisioning process
 */
export async function addProvisionLog(
  userId: string,
  message: string,
  level: 'info' | 'success' | 'error' | 'debug' = 'info'
): Promise<void> {
  const key = `provision-logs:${userId}`;

  const logEntry: ProvisionLog = {
    timestamp: new Date().toISOString(),
    message,
    level,
  };

  console.log(`[PROVISION-LOGGER] Writing to Redis key: ${key}, message: ${message}`);

  try {
    // Add to Redis list
    await redis.rpush(key, JSON.stringify(logEntry));

    // Trim to keep only last MAX_LOGS entries
    await redis.ltrim(key, -MAX_LOGS, -1);

    // Set expiry
    await redis.expire(key, LOG_TTL);

    console.log(`[PROVISION-LOGGER] ✅ Successfully wrote to Redis`);
  } catch (error) {
    console.error(`[PROVISION-LOGGER] ❌ Failed to write to Redis:`, error);
    throw error;
  }
}

/**
 * Get all provision logs for a user
 */
export async function getProvisionLogs(userId: string): Promise<ProvisionLog[]> {
  const key = `provision-logs:${userId}`;
  console.log(`[PROVISION-LOGGER] Fetching logs from Redis key: ${key}`);

  try {
    const logs = await redis.lrange(key, 0, -1);
    console.log(`[PROVISION-LOGGER] ✅ Fetched ${logs.length} logs from Redis`);

    return logs.map(log => JSON.parse(log));
  } catch (error) {
    console.error(`[PROVISION-LOGGER] ❌ Failed to fetch logs from Redis:`, error);
    throw error;
  }
}

/**
 * Clear provision logs for a user
 */
export async function clearProvisionLogs(userId: string): Promise<void> {
  const key = `provision-logs:${userId}`;
  await redis.del(key);
}

/**
 * Wrapper for console.log that also stores in Redis
 */
export function createProvisionLogger(userId: string) {
  return {
    info: (message: string) => {
      console.log(message);
      addProvisionLog(userId, message, 'info').catch(console.error);
    },
    success: (message: string) => {
      console.log(`✅ ${message}`);
      addProvisionLog(userId, message, 'success').catch(console.error);
    },
    error: (message: string) => {
      console.error(`❌ ${message}`);
      addProvisionLog(userId, message, 'error').catch(console.error);
    },
    debug: (message: string) => {
      console.log(`🔍 ${message}`);
      addProvisionLog(userId, message, 'debug').catch(console.error);
    },
  };
}
