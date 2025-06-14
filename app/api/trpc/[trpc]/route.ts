import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";
import { appRouter } from "@/lib/trpc/router";
import { createTRPCContext } from "@/lib/trpc/context";

// Handle incoming tRPC requests
export const runtime = 'nodejs';

const handler = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    router: appRouter,
    req,
    createContext: async () => {
      return createTRPCContext({
        req,
        resHeaders: new Headers(),
      });
    },
    onError: ({
      error,
      path,
    }: {
      error: Error;
      path: string | undefined;
    }) => {
      console.error(`❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
    },
  });
};

export { handler as GET, handler as POST };
