import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    console.log("API route handler: /api/auth/callback started")

    // Get the URL and parse the code parameter
    const url = new URL(request.url)
    const code = url.searchParams.get("code")

    if (!code) {
      console.error("No code parameter in callback URL")
      return new NextResponse(
        JSON.stringify({
          error: "Invalid Callback",
          message: "No authorization code received from GitHub.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    console.log("Received GitHub code, redirecting to homepage")

    // For now, just redirect to the homepage
    // In a real implementation, we would exchange the code for a token here
    return NextResponse.redirect(new URL("/", request.url))
  } catch (error) {
    console.error("Error in GitHub OAuth callback:", error)

    return new NextResponse(
      JSON.stringify({
        error: "Callback Error",
        message: "An error occurred during the GitHub OAuth callback.",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
