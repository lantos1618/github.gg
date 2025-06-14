"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { GithubIcon } from "lucide-react"
import { signIn } from "next-auth/react"

export default function LoginPage() {
  const handleSignIn = () => {
    signIn("github", {
      callbackUrl: "/dashboard"
    })
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Card className="w-[400px] bg-black/70 border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to GitHub.GG</CardTitle>
          <CardDescription>
            Connect your GitHub account to analyze repositories and get AI-powered insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">GitHub.GG needs access to your GitHub account to:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Read your public and private repositories</li>
              <li>Analyze code and repository structure</li>
              <li>Generate AI-powered insights</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-2"
          >
            <GithubIcon className="h-5 w-5" />
            Sign in with GitHub
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
