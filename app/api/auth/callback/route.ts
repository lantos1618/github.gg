import { NextResponse } from "next/server"
import { exchangeCodeForToken, getGitHubUser } from "@/lib/auth-service"
import { encrypt } from "@/lib/encryption"
import { cookies } from "next/headers"

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

    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code)

    // Fetch the authenticated user's info
    const user = await getGitHubUser(accessToken)

    // Store the session in an encrypted cookie
    const session = { user, accessToken }
    const encrypted = await encrypt(JSON.stringify(session))
    const cookieStore = cookies()
    cookieStore.set("github_session", encrypted, {
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
    })

    console.log("GitHub OAuth successful, redirecting to homepage")

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
