'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Play,
  Square,
  Trash2,
  Cpu,
  Activity,
  HardDrive,
  Clock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { getStatusColor, getStatusVariant, formatUptime } from '@/lib/utils/vm';

export interface VMDetails {
  id: string;
  status: string;
  vcpus: number;
  memoryMb: number;
  diskGb: number;
  totalRuntimeMinutes: number;
  internalIp: string | null;
  sshPort: number | null;
}

interface VMStatusCardProps {
  vm: VMDetails;
  onRefresh: () => void;
  onStart: () => void;
  onStop: () => void;
  onDestroy: () => void;
  isStarting: boolean;
  isStopping: boolean;
  isDestroying: boolean;
}

export function VMStatusCard({
  vm,
  onRefresh,
  onStart,
  onStop,
  onDestroy,
  isStarting,
  isStopping,
  isDestroying,
}: VMStatusCardProps) {
  const canStart = vm.status === 'stopped';
  const canStop = vm.status === 'running';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${getStatusColor(vm.status)} animate-pulse`} />
            <CardTitle>VM Status</CardTitle>
            <Badge variant={getStatusVariant(vm.status)}>{vm.status.toUpperCase()}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-blue-600" />
                    vCPUs
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-purple-600" />
                    Memory
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <HardDrive className="h-3.5 w-3.5 text-green-600" />
                    Disk
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                    Runtime
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      vm.status === 'running'
                        ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                        : vm.status === 'error'
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {vm.status === 'running' ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : vm.status === 'error' ? (
                      <AlertCircle className="h-3 w-3" />
                    ) : null}
                    {vm.status}
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono font-semibold">{vm.vcpus}</TableCell>
                <TableCell className="text-center font-mono font-semibold">
                  {vm.memoryMb / 1024}GB
                </TableCell>
                <TableCell className="text-center font-mono font-semibold">{vm.diskGb}GB</TableCell>
                <TableCell className="text-center font-mono">
                  {formatUptime(vm.totalRuntimeMinutes)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      disabled={!canStart || isStarting}
                      onClick={onStart}
                    >
                      {isStarting ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      Start
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!canStop || isStopping}
                      onClick={onStop}
                    >
                      {isStopping ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Square className="h-4 w-4 mr-1" />
                      )}
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isDestroying}
                      onClick={onDestroy}
                    >
                      {isDestroying ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-1" />
                      )}
                      Destroy
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        {/* Connection Info */}
        {vm.status === 'running' && vm.internalIp && (
          <div className="mt-4 p-3 bg-muted rounded-md">
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">IP:</span>
                <code className="bg-background px-2 py-0.5 rounded">{vm.internalIp}</code>
              </div>
              {vm.sshPort && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">SSH Port:</span>
                  <code className="bg-background px-2 py-0.5 rounded">{vm.sshPort}</code>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
