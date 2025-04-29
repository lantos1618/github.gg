import { type NextRequest, NextResponse } from "next/server"
import { exchangeCodeForToken, getGitHubUser } from "@/lib/auth-service"
import { cookies } from "next/headers"
import { encrypt } from "@/lib/encryption"

export async function GET(request: NextRequest) {
  // Get the code and state from the query parameters
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  // Get the stored state from the cookie
  const storedState = cookies().get("github_oauth_state")?.value

  // Validate the state to prevent CSRF attacks
  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/auth/error?error=invalid_state", request.url))
  }

  try {
    // Exchange the code for an access token
    const accessToken = await exchangeCodeForToken(code)

    // Get the user information
    const user = await getGitHubUser(accessToken)

    // Create a session
    const session = {
      user,
      accessToken,
      expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    }

    // Encrypt the session
    const encryptedSession = await encrypt(JSON.stringify(session))

    // Store the session in a cookie
    cookies().set("github_session", encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    })

    // Redirect to the dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("GitHub OAuth error:", error)
    return NextResponse.redirect(new URL("/auth/error?error=oauth_failure", request.url))
  }
}
