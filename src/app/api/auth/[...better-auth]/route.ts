import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://github.gg",
  "https://www.github.gg",
  "https://dev.github.gg",
  "http://localhost:3000",
];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

// Handle OPTIONS preflight requests explicitly
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

// Wrap handlers to add CORS headers
async function withCors(request: NextRequest, handler: typeof auth.handler) {
  const origin = request.headers.get("origin");
  const response = await handler(request);

  // Add CORS headers to the response
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const GET = (request: NextRequest) => withCors(request, auth.handler);
export const POST = (request: NextRequest) => withCors(request, auth.handler); 