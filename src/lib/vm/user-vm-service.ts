/**
 * User VM Service
 * Manages personal VMs for github.gg users
 */

import { db } from '@/db';
import { userVms } from '@/db/schema/user-vms';
import { user } from '@/db/schema/auth';
import { eq } from 'drizzle-orm';
import { EnvironmentOrchestrator } from '../dev-env/orchestrator';
import { queueStartJob, queueStopJob, queueDestroyJob } from '@/lib/queue/vm-queue';
import { sshExecutor } from './ssh-executor';
import fs from 'fs';

export interface UserVmDetails {
  id: string;
  userId: string;
  status: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  sshPort: number | null;
  sshPublicKey: string | null;
  sshUsername: string | null;
  internalIp: string | null;
  environmentId: string | null;
  totalRuntimeMinutes: number;
  lastStartedAt: Date | null;
  lastStoppedAt: Date | null;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VmResourceAllocation {
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  autoStop: boolean;
  autoStopMinutes: number;
}

export class UserVmService {
  private orchestrator: EnvironmentOrchestrator;

  constructor() {
    this.orchestrator = new EnvironmentOrchestrator();
  }

  /**
   * Get VM tier resource allocation
   */
  private getResourcesForTier(tier: string): VmResourceAllocation {
    switch (tier) {
      case 'pro':
        return {
          vcpus: 4,
          memoryMb: 8192,
          diskGb: 50,
          autoStop: false,
          autoStopMinutes: 0,
        };
      case 'unlimited':
        return {
          vcpus: 8,
          memoryMb: 16384,
          diskGb: 100,
          autoStop: false,
          autoStopMinutes: 0,
        };
      case 'free':
      default:
        return {
          vcpus: 2,
          memoryMb: 4096,
          diskGb: 10, // Match quota limit
          autoStop: true,
          autoStopMinutes: 60,
        };
    }
  }

  /**
   * Get or create a user's VM
   */
  async getOrCreateUserVm(
    userId: string,
    vcpus?: number,
    memoryMb?: number,
    diskGb?: number
  ): Promise<UserVmDetails> {
    // Check if user already has VM
    const existing = await db.query.userVms.findFirst({
      where: eq(userVms.userId, userId),
    });

    if (existing) {
      return existing as UserVmDetails;
    }

    // Get user's tier
    const userData = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!userData) {
      throw new Error('User not found');
    }

    // Get resources for user's tier or use custom values
    const tierResources = this.getResourcesForTier(userData.vmTier || 'free');
    const resources = {
      vcpus: vcpus || tierResources.vcpus,
      memoryMb: memoryMb || tierResources.memoryMb,
      diskGb: diskGb || tierResources.diskGb,
      autoStop: tierResources.autoStop,
      autoStopMinutes: tierResources.autoStopMinutes,
    };

    // Create VM record in pending state
    const [newVm] = await db
      .insert(userVms)
      .values({
        userId,
        status: 'pending',
        vcpus: resources.vcpus,
        memoryMb: resources.memoryMb,
        diskGb: resources.diskGb,
        autoStop: resources.autoStop,
        autoStopMinutes: resources.autoStopMinutes,
      })
      .returning();

    // Provision environment asynchronously
    this.provisionEnvironment(newVm.id, userId, resources).catch((error) => {
      console.error('Failed to provision environment:', error);
      // Update VM status to error
      db.update(userVms)
        .set({ status: 'error' })
        .where(eq(userVms.id, newVm.id))
        .catch(console.error);
    });

    return newVm as UserVmDetails;
  }

  /**
   * Provision the actual environment
   */
  private async provisionEnvironment(
    vmId: string,
    userId: string,
    resources: VmResourceAllocation
  ): Promise<void> {
    try {
      // Update status to provisioning
      await db.update(userVms).set({ status: 'provisioning' }).where(eq(userVms.id, vmId));

      // Create environment via orchestrator
      const env = await this.orchestrator.createEnvironment({
        userId,
        name: 'Personal VM',
        resources: {
          vcpus: resources.vcpus,
          memoryMb: resources.memoryMb,
          diskGb: resources.diskGb,
        },
        durationHours: 168, // 7 days
      });

      // Link environment to VM
      await db
        .update(userVms)
        .set({
          environmentId: env.id,
          status: 'stopped',
          internalIp: env.ipAddress || null,
          sshPort: env.sshPort || null,
        })
        .where(eq(userVms.id, vmId));

      console.log(`Successfully provisioned VM ${vmId} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to provision VM ${vmId}:`, error);
      throw error;
    }
  }

  /**
   * Get user's VM
   */
  async getUserVm(userId: string): Promise<UserVmDetails | null> {
    const vm = await db.query.userVms.findFirst({
      where: eq(userVms.userId, userId),
    });

    return vm ? (vm as UserVmDetails) : null;
  }

  /**
   * Start user's VM
   */
  async startVm(userId: string): Promise<UserVmDetails> {
    const vm = await this.getUserVm(userId);
    if (!vm) {
      throw new Error('VM not found');
    }

    if (!vm.environmentId) {
      throw new Error('VM environment not provisioned');
    }

    // Queue start job
    await queueStartJob(vm.environmentId);

    console.log(`📬 Queued start job for VM ${vm.id}`);

    // Return current state (will be updated by worker)
    return vm as UserVmDetails;
  }

  /**
   * Stop user's VM
   */
  async stopVm(userId: string): Promise<UserVmDetails> {
    const vm = await this.getUserVm(userId);
    if (!vm) {
      throw new Error('VM not found');
    }

    if (!vm.environmentId) {
      throw new Error('VM environment not provisioned');
    }

    // Queue stop job
    await queueStopJob(vm.environmentId);

    console.log(`📬 Queued stop job for VM ${vm.id}`);

    // Return current state (will be updated by worker)
    return vm as UserVmDetails;
  }

  /**
   * Execute code in user's VM
   */
  async executeCode(
    userId: string,
    code: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const vm = await this.getUserVm(userId);
    if (!vm) {
      throw new Error('VM not found');
    }

    if (!vm.environmentId) {
      throw new Error('VM environment not provisioned');
    }

    if (!vm.internalIp || !vm.sshPort) {
      throw new Error('VM network details not available');
    }

    if (vm.status === 'provisioning' || vm.status === 'pending') {
      return {
        stdout: '',
        stderr: 'VM is still provisioning, please wait...',
        exitCode: 1,
      };
    }

    // Start VM if it's stopped
    if (vm.status === 'stopped') {
      await this.startVm(userId);
      return {
        stdout: '',
        stderr: 'VM is starting, please try again in a few seconds...',
        exitCode: 1,
      };
    }

    if (vm.status !== 'running') {
      return {
        stdout: '',
        stderr: `VM is ${vm.status}, cannot execute commands`,
        exitCode: 1,
      };
    }

    // Execute code via SSH
    try {
      // TEMPORARY: Use ovh_firecracker key until cloud-init provisioning is fixed
      // TODO: Fix OVH provider to properly send cloud-init with service key
      const keyPath = '/home/ubuntu/.ssh/ovh_firecracker';

      if (!fs.existsSync(keyPath)) {
        return {
          stdout: '',
          stderr: 'SSH key not found',
          exitCode: 1,
        };
      }

      const privateKey = fs.readFileSync(keyPath, 'utf8');

      const result = await sshExecutor.executeCommand(
        {
          host: vm.internalIp,
          port: vm.sshPort,
          username: vm.sshUsername || 'ubuntu', // Use username from DB, default to ubuntu
          privateKey: privateKey,
        },
        code
      );

      // Update last activity
      await db
        .update(userVms)
        .set({ lastActivityAt: new Date() })
        .where(eq(userVms.id, vm.id));

      return result;
    } catch (error: any) {
      console.error('SSH execution error:', error);
      const result = {
        stdout: '',
        stderr: error.message || 'Command execution failed',
        exitCode: 1,
      };

      // Update last activity even on error
      await db
        .update(userVms)
        .set({ lastActivityAt: new Date() })
        .where(eq(userVms.id, vm.id));

      return result;
    }
  }

  /**
   * Get all VMs (admin)
   */
  async getAllVms(): Promise<UserVmDetails[]> {
    const vms = await db.query.userVms.findMany({
      with: {
        user: true,
      },
    });

    return vms as UserVmDetails[];
  }

  /**
   * Destroy user's VM
   */
  async destroyVm(userId: string): Promise<void> {
    const vm = await this.getUserVm(userId);
    if (!vm) {
      throw new Error('VM not found');
    }

    if (!vm.environmentId) {
      // No environment linked, just delete the record
      await db.delete(userVms).where(eq(userVms.id, vm.id));
      return;
    }

    // Queue destroy job
    await queueDestroyJob(vm.environmentId);

    console.log(`📬 Queued destroy job for VM ${vm.id}`);
  }
}
