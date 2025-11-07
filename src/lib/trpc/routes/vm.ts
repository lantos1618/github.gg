import { z } from 'zod';
import { router, protectedProcedure } from '@/lib/trpc/trpc';
import { UserVmService } from '@/lib/vm/user-vm-service';
import { TRPCError } from '@trpc/server';

const vmService = new UserVmService();

export const vmRouter = router({
  // List available OVH regions (REAL data from OVH API)
  listRegions: protectedProcedure
    .query(async () => {
      try {
        const { ovhProvider } = await import('@/lib/vm/ovh-provider');
        const regions = await ovhProvider.listRegions();
        return regions;
      } catch (error) {
        console.error('Failed to list regions:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch available regions from OVH',
        });
      }
    }),

  // List available OVH flavors (REAL data from OVH API)
  listFlavors: protectedProcedure
    .query(async () => {
      try {
        const { ovhProvider } = await import('@/lib/vm/ovh-provider');

        // Just fetch from configured region (OVH_REGION env var, defaults to GRA9)
        // OVH's listRegions() returns abbreviated codes like "BHS" but flavor API needs "BHS5"
        const flavors = await ovhProvider.getAvailableFlavors();
        return flavors;
      } catch (error) {
        console.error('Failed to list flavors:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch available instance types from OVH',
        });
      }
    }),

  // Get current user's VM
  getMyVm: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const vm = await vmService.getUserVm(ctx.user.id);
        return vm;
      } catch (error) {
        console.error('Failed to get VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get VM',
        });
      }
    }),

  // Get provision logs for current user
  getProvisionLogs: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const { getProvisionLogs } = await import('@/lib/vm/provision-logger');
        const logs = await getProvisionLogs(ctx.user.id);
        return logs;
      } catch (error) {
        console.error('Failed to get provision logs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get provision logs',
        });
      }
    }),

  // Provision VM for current user with specific specs
  provisionMyVm: protectedProcedure
    .input(z.object({
      vcpus: z.number().min(1).max(16).default(2),
      memoryMb: z.number().min(1024).default(4096),
      diskGb: z.number().min(10).max(500).default(50),
    }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        const vm = await vmService.getOrCreateUserVm(
          ctx.user.id,
          input?.vcpus,
          input?.memoryMb,
          input?.diskGb
        );
        return vm;
      } catch (error) {
        console.error('Failed to provision VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to provision VM',
        });
      }
    }),

  // Start VM
  startMyVm: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const vm = await vmService.startVm(ctx.user.id);
        return vm;
      } catch (error) {
        console.error('Failed to start VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start VM',
        });
      }
    }),

  // Stop VM
  stopMyVm: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        const vm = await vmService.stopVm(ctx.user.id);
        return vm;
      } catch (error) {
        console.error('Failed to stop VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to stop VM',
        });
      }
    }),

  // Destroy my VM
  destroyMyVm: protectedProcedure
    .mutation(async ({ ctx }) => {
      try {
        await vmService.destroyVm(ctx.user.id);
        return { success: true };
      } catch (error) {
        console.error('Failed to destroy VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to destroy VM',
        });
      }
    }),

  // Execute code in VM
  executeCode: protectedProcedure
    .input(z.object({
      code: z.string().min(1, 'Code is required'),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await vmService.executeCode(ctx.user.id, input.code);
        return result;
      } catch (error) {
        console.error('Failed to execute code:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to execute code',
        });
      }
    }),

  // Execute code with streaming output
  executeCodeStream: protectedProcedure
    .input(z.object({
      command: z.string().min(1, 'Command is required'),
    }))
    .subscription(async function* ({ input, ctx }) {
      try {
        const userId = ctx.user.id;

        // Get user's VM
        const { db } = await import('@/db');
        const { userVms } = await import('@/db/schema/user-vms');
        const { eq } = await import('drizzle-orm');

        const vm = await db.query.userVms.findFirst({
          where: eq(userVms.userId, userId),
        });

        if (!vm) {
          yield { type: 'error', message: 'VM not found' };
          return;
        }

        if (!vm.internalIp || !vm.sshPort) {
          yield { type: 'error', message: 'VM network details not available' };
          return;
        }

        if (vm.status !== 'running') {
          yield { type: 'error', message: `VM is ${vm.status}` };
          return;
        }

        // Execute with streaming
        const fs = await import('fs');
        const { sshExecutor } = await import('@/lib/vm/ssh-executor');

        const keyPath = '/home/ubuntu/.ssh/ovh_firecracker';

        if (!fs.existsSync(keyPath)) {
          yield { type: 'error', message: 'SSH key not found' };
          return;
        }

        const privateKey = fs.readFileSync(keyPath, 'utf8');

        // Stream output
        for await (const event of sshExecutor.executeCommandStreaming(
          {
            host: vm.internalIp,
            port: vm.sshPort,
            username: vm.sshUsername || 'ubuntu',
            privateKey,
          },
          input.command
        )) {
          yield event;
        }

        // Update last activity
        await db
          .update(userVms)
          .set({ lastActivityAt: new Date() })
          .where(eq(userVms.id, vm.id));

      } catch (error) {
        console.error('Failed to execute streaming command:', error);
        yield {
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to execute command'
        };
      }
    }),

  // Admin: Get all VMs
  getAllVms: protectedProcedure
    .query(async ({ ctx }) => {
      // Check if user is admin (from DB role)
      const { db } = await import('@/db');
      const { user } = await import('@/db/schema/auth');
      const { eq } = await import('drizzle-orm');

      const userData = await db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      if (userData?.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      try {
        const vms = await vmService.getAllVms();

        // Get host stats
        const { db } = await import('@/db');
        const { firecrackerHosts } = await import('@/db/schema/dev-environments');
        const hosts = await db.query.firecrackerHosts.findMany();

        // Calculate stats
        const stats = {
          total: vms.length,
          running: vms.filter((v) => v.status === 'running').length,
          stopped: vms.filter((v) => v.status === 'stopped').length,
          provisioning: vms.filter((v) => v.status === 'provisioning').length,
          error: vms.filter((v) => v.status === 'error').length,
          totalVcpus: vms.reduce((sum, v) => sum + v.vcpus, 0),
          totalMemoryMb: vms.reduce((sum, v) => sum + v.memoryMb, 0),
          runningVcpus: vms
            .filter((v) => v.status === 'running')
            .reduce((sum, v) => sum + v.vcpus, 0),
          runningMemoryMb: vms
            .filter((v) => v.status === 'running')
            .reduce((sum, v) => sum + v.memoryMb, 0),
        };

        return { vms, hosts, stats };
      } catch (error) {
        console.error('Failed to get VMs:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get VMs',
        });
      }
    }),

  // Admin: Destroy VM
  destroyVm: protectedProcedure
    .input(z.object({
      vmId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin (from DB role)
      const { db } = await import('@/db');
      const { user } = await import('@/db/schema/auth');
      const { eq } = await import('drizzle-orm');

      const userData = await db.query.user.findFirst({
        where: eq(user.id, ctx.user.id),
      });

      if (userData?.role !== 'admin') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin access required',
        });
      }

      try {
        const { db } = await import('@/db');
        const { userVms } = await import('@/db/schema/user-vms');
        const { eq } = await import('drizzle-orm');

        // Get VM
        const vm = await db.query.userVms.findFirst({
          where: eq(userVms.id, input.vmId),
        });

        if (!vm) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'VM not found',
          });
        }

        // Destroy VM
        await vmService.destroyVm(vm.userId);

        return { success: true };
      } catch (error) {
        console.error('Failed to destroy VM:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to destroy VM',
        });
      }
    }),
});
