import { type NextRequest, NextResponse } from "next/server"
import { analyzeRepository } from "@/lib/repo-analysis-service"
import { cookies } from "next/headers"
import { decrypt } from "@/lib/encryption"

// Rate limiting for unauthenticated users
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const RATE_LIMIT_MAX = 10 // 10 requests per hour for unauthenticated users

// In-memory rate limiting store (would use Redis in production)
const rateLimitStore: Record<string, { count: number; resetAt: number }> = {}

// Rate limiting middleware for unauthenticated requests
function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()

  // Initialize or reset expired rate limit entry
  if (!rateLimitStore[ip] || rateLimitStore[ip].resetAt < now) {
    rateLimitStore[ip] = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW,
    }
  }

  // Check if rate limit is exceeded
  if (rateLimitStore[ip].count >= RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: rateLimitStore[ip].resetAt,
    }
  }

  // Increment count and return
  rateLimitStore[ip].count++
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - rateLimitStore[ip].count,
    resetAt: rateLimitStore[ip].resetAt,
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the repository information from the request
    const { owner, repo } = await request.json()

    if (!owner || !repo) {
      return NextResponse.json({ error: "Missing required parameters: owner and repo" }, { status: 400 })
    }

    // Get the session cookie
    const sessionCookie = cookies().get("github_session")?.value
    let accessToken: string | undefined

    // If there's a session cookie, decrypt it to get the access token
    if (sessionCookie) {
      try {
        const sessionData = await decrypt(sessionCookie)
        const session = JSON.parse(sessionData)
        accessToken = session.accessToken
      } catch (error) {
        console.error("Error decrypting session:", error)
        // Continue without access token
      }
    } else {
      // For unauthenticated users, apply rate limiting
      const ip = request.ip || "unknown"
      const rateLimit = checkRateLimit(ip)

      if (!rateLimit.allowed) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: "Please try again later or sign in with GitHub for higher limits",
            resetAt: new Date(rateLimit.resetAt).toISOString(),
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
              "X-RateLimit-Remaining": String(rateLimit.remaining),
              "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)),
            },
          },
        )
      }
    }

    // Analyze the repository
    const analysis = await analyzeRepository(owner, repo, accessToken)

    return NextResponse.json({
      success: true,
      data: analysis,
      authenticated: !!accessToken,
    })
  } catch (error: any) {
    console.error("Error analyzing repository:", error)

    // Handle specific errors
    if (error.message === "Authentication required to access private repositories") {
      return NextResponse.json(
        {
          error: "Authentication required",
          message: "Please sign in with GitHub to access private repositories",
        },
        { status: 401 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to analyze repository",
        message: error.message || String(error),
      },
      { status: 500 },
    )
  }
}
