'use client';

import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Terminal, Loader2 } from 'lucide-react';

interface ProvisionLog {
  timestamp: string;
  message: string;
  level: 'info' | 'success' | 'error' | 'debug';
}

export function showProvisioningLogs(toastId: string | number, dismiss: () => void) {
  return function ProvisioningLogsToast() {
    const [logs, setLogs] = useState<ProvisionLog[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const [isComplete, setIsComplete] = useState(false);

    // Query logs
    const { data: fetchedLogs } = trpc.vm.getProvisionLogs.useQuery(undefined, {
      refetchInterval: isComplete ? false : 1000, // Poll every second
    });

    // Update logs when fetched
    useEffect(() => {
      if (fetchedLogs) {
        setLogs(fetchedLogs);

        // Check if provisioning is complete
        const hasSuccess = fetchedLogs.some(log =>
          log.level === 'success' && log.message.includes('complete')
        );
        const hasError = fetchedLogs.some(log => log.level === 'error');

        if (hasSuccess || hasError) {
          setIsComplete(true);
          // Auto-dismiss after 5 seconds
          setTimeout(() => dismiss(), 5000);
        }
      }
    }, [fetchedLogs, dismiss]);

    // Auto-scroll to bottom
    useEffect(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const getLogColor = (level: string) => {
      switch (level) {
        case 'success': return 'text-green-400';
        case 'error': return 'text-red-400';
        case 'debug': return 'text-gray-500';
        default: return 'text-blue-300';
      }
    };

    return (
      <div className="w-[400px] bg-white dark:bg-gray-900 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          {!isComplete ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Terminal className="h-4 w-4 text-blue-500" />
          )}
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            {isComplete ? 'Provisioning Complete' : 'Provisioning VM...'}
          </span>
        </div>
        <div className="bg-gray-950 rounded-lg p-3 max-h-[300px] overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for logs...</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`${getLogColor(log.level)} leading-relaxed`}>
                <span className="text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                {' '}
                {log.message}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>
    );
  };
}
