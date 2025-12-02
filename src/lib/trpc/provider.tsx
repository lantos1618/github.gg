'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, httpSubscriptionLink, splitLink } from '@trpc/client';
import React, { useState } from 'react';
import { trpc } from './client';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        // IMPORTANT: our backend work is expensive; never auto-retry API calls
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
      },
    },
  }));
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: httpSubscriptionLink({
            url: '/api/trpc',
            eventSourceOptions: {
              withCredentials: true,
            },
          }),
          false: httpBatchLink({
            url: '/api/trpc',
          }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
} 