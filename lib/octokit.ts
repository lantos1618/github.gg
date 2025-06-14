import { getServerSession } from "next-auth/next"
import { Octokit } from "@octokit/rest"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

export async function createOctokit(accessToken?: string) {
  let token = accessToken
  
  if (!token) {
    const session = await getServerSession(authOptions)
    token = session?.accessToken
  }

  if (!token) {
    throw new Error("No GitHub access token available")
  }

  return new Octokit({ auth: token })
}
