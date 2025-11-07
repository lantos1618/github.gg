'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc/client';
import { toast } from 'sonner';
import { showProvisioningLogs } from '@/components/ProvisioningLogsToast';
import { Terminal as TerminalComponent } from '@/components/Terminal';
import { FlavorSelector } from '@/components/dashboard/FlavorSelector';
import { VMStatusCard } from '@/components/dashboard/VMStatusCard';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { PageHeader, CardWithHeader, LoadingPage } from '@/components/common';
import { Terminal, Shield } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('my-vm');

  // Get current user
  const { data: userData } = trpc.me.useQuery();
  const isAdmin = userData?.user?.role === 'admin';

  // User VM queries
  const {
    data: vm,
    isLoading: vmLoading,
    refetch: refetchVm,
  } = trpc.vm.getMyVm.useQuery(undefined, {
    refetchInterval: 30000,
  });

  // List all available flavors from OVH
  const { data: allFlavors, isLoading: flavorsLoading } = trpc.vm.listFlavors.useQuery();

  // Admin queries
  const {
    data: adminData,
    isLoading: adminLoading,
    refetch: refetchAdmin,
  } = trpc.vm.getAllVms.useQuery(undefined, {
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // VM mutations
  const provisionVm = trpc.vm.provisionMyVm.useMutation({
    onSuccess: () => {
      toast.custom(
        (t) => {
          const toastId = String(t);
          const ToastComponent = showProvisioningLogs(toastId, () => toast.dismiss(toastId));
          return <ToastComponent />;
        },
        {
          duration: Infinity,
        }
      );
      // Poll for updates more aggressively during provisioning
      const interval = setInterval(() => refetchVm(), 3000);
      setTimeout(() => clearInterval(interval), 120000);
    },
    onError: (error) => toast.error(error.message),
  });

  const startVm = trpc.vm.startMyVm.useMutation({
    onSuccess: () => {
      toast.info('Start command sent - VM booting (10-15s)', {
        duration: 4000,
      });
      const interval = setInterval(() => refetchVm(), 2000);
      setTimeout(() => clearInterval(interval), 30000);
    },
    onError: (error) => toast.error(error.message),
  });

  const stopVm = trpc.vm.stopMyVm.useMutation({
    onSuccess: () => {
      toast.success('Stop command sent - VM shutting down');
      refetchVm();
    },
    onError: (error) => toast.error(error.message),
  });

  const destroyVm = trpc.vm.destroyMyVm.useMutation({
    onSuccess: () => {
      toast.success('VM destroyed successfully');
      refetchVm();
      if (isAdmin) refetchAdmin();
    },
    onError: (error) => toast.error(error.message),
  });

  const destroyAdminVm = trpc.vm.destroyVm.useMutation({
    onSuccess: () => {
      toast.success('VM destroyed successfully');
      refetchAdmin();
    },
    onError: (error) => toast.error(error.message),
  });

  const executeCode = trpc.vm.executeCode.useMutation();

  const handleProvisionFlavor = (vcpus: number, ramGb: number, diskGb: number) => {
    provisionVm.mutate({
      vcpus,
      memoryMb: ramGb * 1024,
      diskGb,
    });
  };

  const handleDestroyVM = () => {
    if (confirm('Destroy your VM?\n\nThis action cannot be undone.')) {
      destroyVm.mutate();
    }
  };

  const handleDestroyAdminVM = (vmId: string, userId: string) => {
    destroyAdminVm.mutate({ vmId });
  };

  return (
    <div className="container py-8 max-w-7xl px-4 md:px-8">
      <PageHeader title="Dashboard" description="Manage your development environment" />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="my-vm">My VM</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin">
              <Shield className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* My VM Tab */}
        <TabsContent value="my-vm" className="space-y-6">
          {vmLoading ? (
            <LoadingPage />
          ) : !vm ? (
            <FlavorSelector
              flavors={allFlavors}
              isLoading={flavorsLoading}
              isPending={provisionVm.isPending}
              onProvision={handleProvisionFlavor}
            />
          ) : (
            <>
              <VMStatusCard
                vm={vm}
                onRefresh={() => refetchVm()}
                onStart={() => startVm.mutate()}
                onStop={() => stopVm.mutate()}
                onDestroy={handleDestroyVM}
                isStarting={startVm.isPending}
                isStopping={stopVm.isPending}
                isDestroying={destroyVm.isPending}
              />

              {/* Terminal */}
              {vm.status === 'running' && (
                <CardWithHeader
                  title="Terminal"
                  description="Interactive terminal for your VM"
                  icon={Terminal}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <TerminalComponent
                      onCommand={async (command) => {
                        const result = await executeCode.mutateAsync({ code: command });
                        return result;
                      }}
                      className="w-full"
                    />
                  </div>
                </CardWithHeader>
              )}
            </>
          )}
        </TabsContent>

        {/* Admin Tab */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <AdminDashboard
              data={adminData}
              isLoading={adminLoading}
              onRefresh={() => refetchAdmin()}
              onDestroyVM={handleDestroyAdminVM}
              isDestroying={destroyAdminVm.isPending}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
