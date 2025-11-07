#!/usr/bin/env bun
import { Worker, Job } from 'bullmq';
import {
  vmProvisionQueue,
  vmControlQueue,
  redisConnection,
  type ProvisionVMJob,
  type StartVMJob,
  type StopVMJob,
  type DestroyVMJob,
} from '@/lib/queue/vm-queue';
import { dockerProvider } from '@/lib/vm/docker-provider';
import { ovhProvider } from '@/lib/vm/ovh-provider';
import { createProvisionLogger } from '@/lib/vm/provision-logger';
import { db } from '@/db';
import { devEnvironments, userVms } from '@/db/schema';
import { eq } from 'drizzle-orm';

console.log('🚀 Starting VM Worker...');

// Select provider based on environment
const VM_PROVIDER = process.env.VM_PROVIDER || 'docker';
const provider = VM_PROVIDER === 'ovh' ? ovhProvider : dockerProvider;

console.log(`📡 Using ${VM_PROVIDER.toUpperCase()} provider for VM provisioning`);

// Provision worker
const provisionWorker = new Worker<ProvisionVMJob>(
  'vm-provision',
  async (job: Job<ProvisionVMJob>) => {
    const { environmentId, userId, vcpus, memoryMb, diskGb, initScript, environmentVars } = job.data;

    // Create logger for this user
    const logger = createProvisionLogger(userId);

    logger.info(`📦 Provisioning job started: ${environmentId}`);
    console.log(`\n📦 Provisioning job started: ${environmentId}`);

    try {
      logger.info('Updating status to provisioning...');

      // Update status to provisioning
      await db
        .update(devEnvironments)
        .set({ state: 'provisioning' })
        .where(eq(devEnvironments.id, environmentId));

      logger.info(`Creating ${VM_PROVIDER.toUpperCase()} VM with ${vcpus} vCPUs, ${memoryMb}MB RAM...`);

      // Create VM using selected provider
      const vmDetails = await provider.createVM({
        name: `gh-gg-${environmentId.substring(0, 8)}`,
        vcpus,
        memoryMb,
        environmentVars,
      });

      logger.info(`VM created successfully! ID: ${vmDetails.instanceId || vmDetails.containerId}`);
      logger.info(`IP: ${vmDetails.ipAddress}, SSH Port: ${vmDetails.sshPort}`);

      // Store VM details
      await db
        .update(devEnvironments)
        .set({
          state: 'running',
          vmId: VM_PROVIDER === 'ovh' ? vmDetails.instanceId : vmDetails.containerId,
          ipAddress: vmDetails.ipAddress,
          sshPort: vmDetails.sshPort,
        })
        .where(eq(devEnvironments.id, environmentId));

      logger.info('Linking VM to user account...');

      // Update user VM status - OVH VMs are running immediately after creation
      await db
        .update(userVms)
        .set({
          status: 'running',
          environmentId,
          internalIp: vmDetails.ipAddress,
          sshPort: vmDetails.sshPort,
        })
        .where(eq(userVms.userId, userId));

      logger.success(`✅ Provisioning complete! Your VM is ready and running.`);
      console.log(`✅ Provisioning complete: ${environmentId}`);

      return { success: true, vmDetails };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Provisioning failed: ${errorMessage}`);
      console.error(`❌ Provisioning failed: ${environmentId}`, error);

      // Update status to error
      await db
        .update(devEnvironments)
        .set({ state: 'error' })
        .where(eq(devEnvironments.id, environmentId));

      await db
        .update(userVms)
        .set({ status: 'error' })
        .where(eq(userVms.userId, userId));

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process up to 2 provisioning jobs at once
  }
);

// Control worker (start/stop/destroy)
const controlWorker = new Worker<StartVMJob | StopVMJob | DestroyVMJob>(
  'vm-control',
  async (job: Job<StartVMJob | StopVMJob | DestroyVMJob>) => {
    const { environmentId } = job.data;
    const action = job.name; // 'start', 'stop', or 'destroy'

    console.log(`\n⚙️  Control job: ${action} for ${environmentId}`);

    try {
      // Get environment details
      const env = await db.query.devEnvironments.findFirst({
        where: eq(devEnvironments.id, environmentId),
      });

      if (!env || !env.vmId) {
        throw new Error('Environment or VM ID not found');
      }

      // Perform action
      switch (action) {
        case 'start':
          await db
            .update(devEnvironments)
            .set({ state: 'starting' })
            .where(eq(devEnvironments.id, environmentId));

          await provider.startVM(env.vmId);

          await db
            .update(devEnvironments)
            .set({ state: 'running' })
            .where(eq(devEnvironments.id, environmentId));

          await db
            .update(userVms)
            .set({ status: 'running', lastStartedAt: new Date() })
            .where(eq(userVms.environmentId, environmentId));

          break;

        case 'stop':
          await db
            .update(devEnvironments)
            .set({ state: 'stopping' })
            .where(eq(devEnvironments.id, environmentId));

          await provider.stopVM(env.vmId);

          await db
            .update(devEnvironments)
            .set({ state: 'stopped' })
            .where(eq(devEnvironments.id, environmentId));

          // Calculate runtime
          const vm = await db.query.userVms.findFirst({
            where: eq(userVms.environmentId, environmentId),
          });

          if (vm?.lastStartedAt) {
            const runtimeMinutes = Math.floor(
              (Date.now() - vm.lastStartedAt.getTime()) / (1000 * 60)
            );
            await db
              .update(userVms)
              .set({
                status: 'stopped',
                lastStoppedAt: new Date(),
                totalRuntimeMinutes: vm.totalRuntimeMinutes + runtimeMinutes,
              })
              .where(eq(userVms.id, vm.id));
          }

          break;

        case 'destroy':
          await db
            .update(devEnvironments)
            .set({ state: 'destroying' })
            .where(eq(devEnvironments.id, environmentId));

          await provider.destroyVM(env.vmId);

          await db
            .update(devEnvironments)
            .set({ state: 'destroyed' })
            .where(eq(devEnvironments.id, environmentId));

          // Delete user VM record
          await db
            .delete(userVms)
            .where(eq(userVms.environmentId, environmentId));

          break;
      }

      console.log(`✅ ${action} complete: ${environmentId}`);

      return { success: true };
    } catch (error) {
      console.error(`❌ ${action} failed: ${environmentId}`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process multiple control actions at once
  }
);

// Event handlers
provisionWorker.on('completed', (job) => {
  console.log(`✅ Provision job completed: ${job.id}`);
});

provisionWorker.on('failed', (job, err) => {
  console.error(`❌ Provision job failed: ${job?.id}`, err.message);
});

controlWorker.on('completed', (job) => {
  console.log(`✅ Control job completed: ${job.id}`);
});

controlWorker.on('failed', (job, err) => {
  console.error(`❌ Control job failed: ${job?.id}`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down workers...');
  await provisionWorker.close();
  await controlWorker.close();
  await redisConnection.quit();
  process.exit(0);
});

console.log('✅ VM Worker ready and listening for jobs');
console.log('   - Provision worker: concurrency 2');
console.log('   - Control worker: concurrency 5');
