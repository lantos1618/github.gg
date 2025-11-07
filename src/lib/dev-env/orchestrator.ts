import { db } from '@/db';
import { devEnvironments, firecrackerHosts, environmentAuditLog, userQuotas } from '@/db/schema';
import { eq, and, lt, gte } from 'drizzle-orm';
import { generateId } from '@/lib/utils/id-generator';

export type EnvironmentState =
  | 'requested'
  | 'provisioning'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'destroying'
  | 'destroyed'
  | 'error';

export interface CreateEnvironmentRequest {
  userId: string;
  name?: string;
  resources?: {
    vcpus?: number;
    memoryMb?: number;
    diskGb?: number;
  };
  durationHours?: number;
  repositoryUrl?: string;
  initScript?: string;
  environmentVars?: Record<string, string>;
}

export interface EnvironmentDetails {
  id: string;
  slug: string;
  state: EnvironmentState;
  ipAddress: string | null;
  sshPort: number | null;
  vscodePort: number | null;
  wsEndpoint: string | null;
  accessToken: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export class EnvironmentOrchestrator {
  /**
   * Create a new development environment
   */
  async createEnvironment(request: CreateEnvironmentRequest): Promise<EnvironmentDetails> {
    // 1. Check user quotas
    await this.checkQuotas(request.userId, request.resources);

    // 2. Find available host
    const host = await this.findAvailableHost(request.resources);
    if (!host) {
      throw new Error('No available hosts. All capacity is currently in use.');
    }

    // 3. Generate environment slug
    const slug = `env_${generateId(8)}`;
    const accessToken = generateId(32);

    // 4. Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (request.durationHours || 24));

    // 5. Create environment record
    const [environment] = await db
      .insert(devEnvironments)
      .values({
        userId: request.userId,
        name: request.name,
        slug,
        hostId: host.id,
        vmId: `vm_${slug}`,
        vcpus: request.resources?.vcpus || 2,
        memoryMb: request.resources?.memoryMb || 4096,
        diskGb: request.resources?.diskGb || 10,
        state: 'requested',
        expiresAt,
        repositoryUrl: request.repositoryUrl,
        initScript: request.initScript,
        environmentVars: request.environmentVars,
        accessToken,
      })
      .returning();

    // 6. Log audit event
    await this.logAudit({
      userId: request.userId,
      environmentId: environment.id,
      action: 'create',
      status: 'success',
      metadata: { request },
    });

    // 7. Queue provisioning job
    await this.queueProvisioningJob(environment.id);

    return {
      id: environment.id,
      slug: environment.slug,
      state: environment.state as EnvironmentState,
      ipAddress: environment.ipAddress,
      sshPort: environment.sshPort,
      vscodePort: environment.vscodePort,
      wsEndpoint: environment.wsEndpoint,
      accessToken: environment.accessToken,
      expiresAt: environment.expiresAt,
      createdAt: environment.createdAt,
    };
  }

  /**
   * Transition environment to a new state
   */
  async transitionState(
    environmentId: string,
    newState: EnvironmentState,
    metadata?: Record<string, any>
  ): Promise<void> {
    const [environment] = await db
      .update(devEnvironments)
      .set({
        state: newState,
        stateMessage: metadata?.message,
        updatedAt: new Date(),
      })
      .where(eq(devEnvironments.id, environmentId))
      .returning();

    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }

    // Log state transition
    await this.logAudit({
      userId: environment.userId,
      environmentId,
      action: `state_transition_${newState}`,
      status: 'success',
      metadata: { previousState: environment.state, newState, ...metadata },
    });

    // Execute state-specific actions
    await this.handleStateTransition(environment, newState);
  }

  /**
   * Handle state-specific actions
   */
  private async handleStateTransition(
    environment: any,
    newState: EnvironmentState
  ): Promise<void> {
    switch (newState) {
      case 'provisioning':
        // Trigger VM creation on host
        await this.provisionVM(environment);
        break;

      case 'starting':
        // Start the VM
        await this.startVM(environment);
        break;

      case 'running':
        // Update last activity
        await db
          .update(devEnvironments)
          .set({
            startedAt: new Date(),
            lastActivityAt: new Date(),
          })
          .where(eq(devEnvironments.id, environment.id));
        break;

      case 'stopping':
        // Stop the VM
        await this.stopVM(environment);
        break;

      case 'stopped':
        await db
          .update(devEnvironments)
          .set({
            stoppedAt: new Date(),
          })
          .where(eq(devEnvironments.id, environment.id));
        break;

      case 'destroying':
        // Destroy the VM
        await this.destroyVM(environment);
        break;

      case 'destroyed':
        await db
          .update(devEnvironments)
          .set({
            stoppedAt: new Date(),
          })
          .where(eq(devEnvironments.id, environment.id));
        break;
    }
  }

  /**
   * Check if user has quota to create environment
   */
  private async checkQuotas(
    userId: string,
    resources?: { vcpus?: number; memoryMb?: number; diskGb?: number }
  ): Promise<void> {
    const [quota] = await db
      .select()
      .from(userQuotas)
      .where(eq(userQuotas.userId, userId))
      .limit(1);

    if (!quota) {
      // Create default quota
      await db.insert(userQuotas).values({ userId });
      return;
    }

    // Check current usage
    const currentEnvs = await db
      .select()
      .from(devEnvironments)
      .where(
        and(
          eq(devEnvironments.userId, userId),
          gte(devEnvironments.state, 'provisioning'),
          lt(devEnvironments.state, 'destroying')
        )
      );

    if (currentEnvs.length >= quota.maxConcurrentEnvironments) {
      throw new Error(
        `Quota exceeded: You can have max ${quota.maxConcurrentEnvironments} concurrent environments`
      );
    }

    // Check resource limits
    const requestedVcpus = resources?.vcpus || 2;
    const requestedMemory = resources?.memoryMb || 4096;
    const requestedDisk = resources?.diskGb || 10;

    if (requestedVcpus > quota.maxVcpus) {
      throw new Error(`Quota exceeded: Max vCPUs is ${quota.maxVcpus}`);
    }

    if (requestedMemory > quota.maxMemoryMb) {
      throw new Error(`Quota exceeded: Max memory is ${quota.maxMemoryMb}MB`);
    }

    if (requestedDisk > quota.maxDiskGb) {
      throw new Error(`Quota exceeded: Max disk is ${quota.maxDiskGb}GB`);
    }
  }

  /**
   * Find a host with available capacity
   */
  private async findAvailableHost(resources?: {
    vcpus?: number;
    memoryMb?: number;
  }): Promise<any> {
    const requiredVcpus = resources?.vcpus || 2;
    const requiredMemory = resources?.memoryMb || 4096;

    // Find hosts with capacity
    const hosts = await db
      .select()
      .from(firecrackerHosts)
      .where(eq(firecrackerHosts.status, 'ready'));

    for (const host of hosts) {
      const availableVcpus = host.maxVcpus - host.currentVcpus;
      const availableMemory = host.maxMemoryMb - host.currentMemoryMb;
      const availableVms = host.maxVms - host.currentVms;

      if (
        availableVcpus >= requiredVcpus &&
        availableMemory >= requiredMemory &&
        availableVms > 0
      ) {
        // Update host usage
        await db
          .update(firecrackerHosts)
          .set({
            currentVms: host.currentVms + 1,
            currentVcpus: host.currentVcpus + requiredVcpus,
            currentMemoryMb: host.currentMemoryMb + requiredMemory,
          })
          .where(eq(firecrackerHosts.id, host.id));

        return host;
      }
    }

    return null;
  }

  /**
   * Log audit event
   */
  private async logAudit(params: {
    userId: string;
    environmentId: string;
    action: string;
    status: string;
    metadata?: any;
    errorMessage?: string;
  }): Promise<void> {
    await db.insert(environmentAuditLog).values({
      userId: params.userId,
      environmentId: params.environmentId,
      action: params.action,
      status: params.status,
      metadata: params.metadata,
      errorMessage: params.errorMessage,
    });
  }

  /**
   * Queue a provisioning job (to be handled by worker)
   */
  private async queueProvisioningJob(environmentId: string): Promise<void> {
    // Get environment details to pass to worker
    const env = await db.query.devEnvironments.findFirst({
      where: eq(devEnvironments.id, environmentId),
    });

    if (!env) {
      throw new Error(`Environment ${environmentId} not found`);
    }

    // Import queue functions
    const { queueProvisionJob } = await import('@/lib/queue/vm-queue');

    // Queue the provisioning job
    await queueProvisionJob({
      environmentId: env.id,
      userId: env.userId,
      vcpus: env.vcpus,
      memoryMb: env.memoryMb,
      diskGb: env.diskGb,
      initScript: env.initScript || undefined,
      environmentVars: (env.environmentVars as Record<string, string>) || undefined,
    });

    console.log(`📬 Queued provisioning job for environment ${environmentId}`);
  }

  /**
   * Provision VM on host (called by worker)
   */
  private async provisionVM(environment: any): Promise<void> {
    // TODO: Call Firecracker control plane agent on host
    // This will be implemented when we build the control plane agent
    console.log('Provisioning VM:', environment.vmId);
  }

  /**
   * Start VM
   */
  private async startVM(environment: any): Promise<void> {
    // TODO: Call Firecracker control plane agent
    console.log('Starting VM:', environment.vmId);
  }

  /**
   * Stop VM
   */
  private async stopVM(environment: any): Promise<void> {
    // TODO: Call Firecracker control plane agent
    console.log('Stopping VM:', environment.vmId);
  }

  /**
   * Destroy VM
   */
  private async destroyVM(environment: any): Promise<void> {
    // TODO: Call Firecracker control plane agent
    console.log('Destroying VM:', environment.vmId);

    // Free up host resources
    const host = await db
      .select()
      .from(firecrackerHosts)
      .where(eq(firecrackerHosts.id, environment.hostId))
      .limit(1);

    if (host.length > 0) {
      await db
        .update(firecrackerHosts)
        .set({
          currentVms: Math.max(0, host[0].currentVms - 1),
          currentVcpus: Math.max(0, host[0].currentVcpus - environment.vcpus),
          currentMemoryMb: Math.max(0, host[0].currentMemoryMb - environment.memoryMb),
        })
        .where(eq(firecrackerHosts.id, environment.hostId));
    }
  }

  /**
   * Get environment details
   */
  async getEnvironment(environmentId: string): Promise<EnvironmentDetails | null> {
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(eq(devEnvironments.id, environmentId))
      .limit(1);

    if (!environment) {
      return null;
    }

    return {
      id: environment.id,
      slug: environment.slug,
      state: environment.state as EnvironmentState,
      ipAddress: environment.ipAddress,
      sshPort: environment.sshPort,
      vscodePort: environment.vscodePort,
      wsEndpoint: environment.wsEndpoint,
      accessToken: environment.accessToken,
      expiresAt: environment.expiresAt,
      createdAt: environment.createdAt,
    };
  }

  /**
   * List user's environments
   */
  async listEnvironments(userId: string): Promise<EnvironmentDetails[]> {
    const environments = await db
      .select()
      .from(devEnvironments)
      .where(eq(devEnvironments.userId, userId));

    return environments.map((env) => ({
      id: env.id,
      slug: env.slug,
      state: env.state as EnvironmentState,
      ipAddress: env.ipAddress,
      sshPort: env.sshPort,
      vscodePort: env.vscodePort,
      wsEndpoint: env.wsEndpoint,
      accessToken: env.accessToken,
      expiresAt: env.expiresAt,
      createdAt: env.createdAt,
    }));
  }

  /**
   * Destroy environment
   */
  async destroyEnvironment(environmentId: string, userId: string): Promise<void> {
    const [environment] = await db
      .select()
      .from(devEnvironments)
      .where(
        and(eq(devEnvironments.id, environmentId), eq(devEnvironments.userId, userId))
      )
      .limit(1);

    if (!environment) {
      throw new Error('Environment not found');
    }

    await this.transitionState(environmentId, 'destroying');
    await this.transitionState(environmentId, 'destroyed');
  }
}

export const orchestrator = new EnvironmentOrchestrator();
