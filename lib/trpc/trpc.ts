import { httpBatchLink, loggerLink } from "@trpc/client";
import { createTRPCProxyClient, createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";

import { type AppRouter } from "./router";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
};

// Create the tRPC client for React Query
export const trpc = createTRPCReact<AppRouter>();

// Create a vanilla tRPC client for non-React usage
export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) => process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: {
        serialize: (data) => superjson.serialize(data),
        deserialize: (data) => superjson.deserialize(data),
      },
      headers: async () => ({
        // Add any headers you need here
        // authorization: getAuthCookie()
      }),
    }),
  ]
});

/**
 * Inference helper for inputs
 * @example type HelloInput = RouterInputs['example']['hello']
 **/
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs
 * @example type HelloOutput = RouterOutputs['example']['hello']
 **/
export type RouterOutputs = inferRouterOutputs<AppRouter>;

// Export the type of the tRPC client for use in components
export type TrpcClient = typeof trpc;
