'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Server, Cpu, Activity, HardDrive, RefreshCw } from 'lucide-react';

export interface Flavor {
  id: string;
  name: string;
  region: string;
  vcpus: number;
  ram: number;
  disk: number;
  type: string;
  available: boolean;
}

interface FlavorSelectorProps {
  flavors: Flavor[] | undefined;
  isLoading: boolean;
  isPending: boolean;
  onProvision: (vcpus: number, ramGb: number, diskGb: number) => void;
}

export function FlavorSelector({
  flavors,
  isLoading,
  isPending,
  onProvision,
}: FlavorSelectorProps) {
  const [search, setSearch] = useState('');

  const filteredFlavors = flavors?.filter((flavor) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      flavor.name.toLowerCase().includes(searchLower) ||
      flavor.region.toLowerCase().includes(searchLower) ||
      flavor.type.toLowerCase().includes(searchLower) ||
      flavor.vcpus.toString().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Select VM Configuration
            </CardTitle>
            <CardDescription>All available instances from OVH Cloud</CardDescription>
          </div>
          <Input
            type="text"
            placeholder="Search flavors, regions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[250px]"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-muted-foreground">Loading available configurations from OVH...</p>
            </div>
          </div>
        ) : !filteredFlavors || filteredFlavors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Server className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>{search ? 'No flavors match your search' : 'No instance types available'}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Flavor</TableHead>
                  <TableHead className="w-[120px]">Region</TableHead>
                  <TableHead className="w-[100px] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-blue-600" />
                      vCPUs
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <Activity className="h-3.5 w-3.5 text-purple-600" />
                      RAM
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px] text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <HardDrive className="h-3.5 w-3.5 text-green-600" />
                      Disk
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFlavors.map((flavor) => (
                  <TableRow key={flavor.id || flavor.name}>
                    <TableCell>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {flavor.name}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {flavor.region}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono">{flavor.vcpus}</TableCell>
                    <TableCell className="text-center font-mono">{flavor.ram}GB</TableCell>
                    <TableCell className="text-center font-mono">{flavor.disk}GB</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => onProvision(flavor.vcpus, flavor.ram, flavor.disk)}
                        className="min-w-[90px]"
                      >
                        {isPending ? 'Provisioning...' : 'Provision'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
