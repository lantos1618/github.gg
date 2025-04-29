import { NextResponse } from "next/server"
import { getGitHubAuthURL } from "@/lib/auth-service"
import { cookies } from "next/headers"
import { v4 as uuidv4 } from "uuid"

export async function GET() {
  // Generate a random state to prevent CSRF attacks
  const state = uuidv4()

  // Store the state in a cookie
  cookies().set("github_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  })

  // Generate the GitHub OAuth URL
  const authUrl = getGitHubAuthURL(state)

  // Redirect to GitHub
  return NextResponse.redirect(authUrl)
}
