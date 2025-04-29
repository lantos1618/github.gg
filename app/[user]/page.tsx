import type { Metadata } from "next"
import UserProfile from "@/components/user/user-profile"
import { getUserData } from "@/lib/github"
import { cookies } from "next/headers"
import { decrypt } from "@/lib/encryption"
import { notFound } from "next/navigation"

export async function generateMetadata({ params }: { params: { user: string } }): Promise<Metadata> {
  // Don't try to generate metadata for reserved paths
  if (params.user === "search") {
    return {
      title: "Search - GitHub.GG",
      description: "Search for repositories, users, and issues on GitHub.GG",
    }
  }

  try {
    const userData = await getUserData(params.user)
    return {
      title: `${userData?.name || params.user} - GitHub.GG`,
      description: `AI-powered analysis of ${params.user}'s GitHub profile and repositories`,
    }
  } catch (error) {
    return {
      title: "User Not Found - GitHub.GG",
      description: "The requested user profile could not be found",
    }
  }
}

export default async function UserPage({ params }: { params: { user: string } }) {
  // Handle reserved paths - only return notFound for "search" now
  // We're removing "docs" from this check to allow the docs route to work
  if (params.user === "search") {
    notFound()
    return null
  }

  // Try to get the user's token if they're logged in
  let token: string | undefined
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get("github_session")

  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(decrypt(sessionCookie.value))
      token = session.accessToken
    } catch (error) {
      console.error("Error decrypting session:", error)
    }
  }

  try {
    // Fetch user data with the token if available
    const userData = await getUserData(params.user, token)

    if (!userData) {
      notFound()
      return null
    }

    return (
      <div className="container py-8">
        <UserProfile username={params.user} userData={userData} />
      </div>
    )
  } catch (error) {
    console.error("Error fetching user data:", error)
    notFound()
    return null
  }
}
