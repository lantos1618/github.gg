import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/lib/trpc/routes';

export const trpc = createTRPCReact<AppRouter>(); 