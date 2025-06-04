import { NextResponse } from "next/server"
import { getGitHubAuthURL } from "@/lib/auth-service"

export async function GET() {
  try {
    console.log("API route handler: /api/auth/login started")

    if (!process.env.GITHUB_CLIENT_ID) {
      console.error("GitHub Client ID is not configured")
      return NextResponse.json(
        { error: "Configuration Error", message: "GitHub OAuth not configured" },
        { status: 500 },
      )
    }

    const state = Math.random().toString(36).slice(2)
    const authUrl = getGitHubAuthURL(state)

    console.log("Redirecting to GitHub OAuth:", authUrl)

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
