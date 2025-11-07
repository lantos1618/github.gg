'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatCard } from '@/components/ui/stat-card';
import { LoadingPage, EmptyState } from '@/components/ui/loading-spinner';
import {
  Server,
  Cpu,
  Activity,
  Clock,
  RefreshCw,
  CheckCircle,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { getStatusColor, getStatusVariant, formatUptime } from '@/lib/utils/vm';

export interface AdminStats {
  total: number;
  running: number;
  stopped: number;
  totalVcpus: number;
  runningVcpus: number;
  totalMemoryMb: number;
  runningMemoryMb: number;
}

export interface AdminVM {
  id: string;
  userId: string;
  status: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  totalRuntimeMinutes: number;
  createdAt: Date;
}

export interface AdminData {
  stats: AdminStats;
  vms: AdminVM[];
}

interface AdminDashboardProps {
  data: AdminData | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  onDestroyVM: (vmId: string, userId: string) => void;
  isDestroying: boolean;
}

export function AdminDashboard({
  data,
  isLoading,
  onRefresh,
  onDestroyVM,
  isDestroying,
}: AdminDashboardProps) {
  if (isLoading) {
    return <LoadingPage />;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total" value={data.stats.total} />

        <StatCard title="Running" value={data.stats.running} icon={CheckCircle} variant="success" />

        <StatCard title="Stopped" value={data.stats.stopped} />

        <StatCard
          title="vCPUs"
          value={data.stats.runningVcpus}
          subtitle={`of ${data.stats.totalVcpus}`}
          icon={Cpu}
          variant="info"
        />

        <StatCard
          title="Memory"
          value={`${Math.round(data.stats.runningMemoryMb / 1024)}GB`}
          subtitle={`of ${Math.round(data.stats.totalMemoryMb / 1024)}GB`}
          icon={Activity}
          variant="info"
          className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20"
        />
      </div>

      {/* VMs List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All VMs ({data.vms.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.vms.length === 0 ? (
            <EmptyState icon={Server} title="No VMs found" />
          ) : (
            <div className="space-y-3">
              {data.vms.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-5 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-2 w-2 rounded-full ${getStatusColor(v.status)} animate-pulse`}
                      />
                      <span className="font-mono font-medium">{v.userId}</span>
                      <Badge variant={getStatusVariant(v.status)}>{v.status}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(v.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 mr-6">
                    <div className="flex items-center gap-2 text-sm">
                      <Cpu className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">{v.vcpus}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="h-4 w-4 text-purple-600" />
                      <span className="font-semibold">{v.memoryMb / 1024}GB</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-semibold">{formatUptime(v.totalRuntimeMinutes)}</div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                          if (
                            confirm(`Destroy VM for ${v.userId}?\n\nThis action cannot be undone.`)
                          ) {
                            onDestroyVM(v.id, v.userId);
                          }
                        }}
                        disabled={isDestroying}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete VM
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
