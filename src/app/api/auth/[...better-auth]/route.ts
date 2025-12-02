import { auth } from "@/lib/auth";

// Better Auth handles CORS automatically via trustedOrigins config in src/lib/auth/index.ts
// The trustedOrigins includes: github.gg, www.github.gg, dev.github.gg, localhost:3000
export const GET = auth.handler;
export const POST = auth.handler;
export const OPTIONS = auth.handler; 