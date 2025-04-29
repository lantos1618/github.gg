import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// List of reserved paths that should not be treated as usernames
const RESERVED_PATHS = ["search", "login", "signup", "explore", "settings", "notifications", "docs"]

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname

  // Check if the path is directly under the root and is a reserved path
  const segments = pathname.split("/").filter(Boolean)

  // If this is a docs path, let it pass through without any modifications
  if (segments[0] === "docs") {
    return NextResponse.next()
  }

  // For other reserved paths
  if (segments.length === 1 && RESERVED_PATHS.includes(segments[0])) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except those starting with api, _next, static, etc.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
