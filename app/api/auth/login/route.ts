import { NextResponse } from "next/server"

export async function GET() {
  try {
    // For debugging: log that we're entering the route handler
    console.log("API route handler: /api/auth/login started")

    // Check if GitHub client ID is configured
    const clientId = process.env.GITHUB_CLIENT_ID
    if (!clientId) {
      console.error("GitHub Client ID is not configured")
      return new NextResponse(
        JSON.stringify({
          error: "Configuration Error",
          message: "GitHub OAuth is not properly configured. Missing GITHUB_CLIENT_ID.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    // Create a simple redirect URL without state for now
    // We'll add state back once we confirm basic functionality works
    const redirectUri = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/callback`
      : "http://localhost:3000/api/auth/callback"

    const scopes = ["repo", "read:user", "user:email"].join(" ")

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

    console.log("Redirecting to GitHub OAuth:", authUrl)

    // Redirect to GitHub
    return NextResponse.redirect(authUrl)
  } catch (error) {
    // Log the full error for debugging
    console.error("Error in GitHub OAuth login:", error)

    // Return a detailed error response
    return new NextResponse(
      JSON.stringify({
        error: "OAuth Error",
        message: "An error occurred during the GitHub OAuth process.",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
