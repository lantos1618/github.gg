import { auth } from "@/lib/auth";

// Better Auth handles CORS automatically via trustedOrigins
// Pass all methods through to its handler
export const GET = auth.handler;
export const POST = auth.handler;
export const OPTIONS = auth.handler; 