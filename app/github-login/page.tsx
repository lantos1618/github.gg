"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GithubIcon } from "lucide-react"

export default function GitHubLoginPage() {
  // Function to handle GitHub login
  const handleGitHubLogin = () => {
    // Get GitHub OAuth URL
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID

    if (!clientId) {
      console.error("GitHub Client ID is not configured")
      alert("GitHub OAuth is not properly configured. Missing GITHUB_CLIENT_ID.")
      return
    }

    // Create GitHub OAuth URL
    const redirectUri =
      typeof window !== "undefined"
        ? `${window.location.origin}/api/auth/callback`
        : "http://localhost:3000/api/auth/callback"

    const scopes = ["repo", "read:user", "user:email"].join(" ")

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
    })

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`

    // Redirect to GitHub
    window.location.href = authUrl
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in with GitHub</CardTitle>
          <CardDescription>Connect your GitHub account to access GitHub.GG features</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Signing in with GitHub allows you to:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Access private repositories</li>
            <li>Analyze your code</li>
            <li>Get personalized recommendations</li>
            <li>Save your preferences</li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleGitHubLogin}>
            <GithubIcon className="mr-2 h-4 w-4" />
            Sign in with GitHub
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
