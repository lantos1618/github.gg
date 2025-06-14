import { redirect } from "next/navigation"

// Consider making this configurable via environment variables if needed
const DEFAULT_VIEW = "sigma"

export default function RepoPage({ params }: { params: { user: string; repo: string } }) {
  const { user, repo } = params
  
  // This will handle both server and client redirects
  redirect(`/${user}/${repo}/${DEFAULT_VIEW}`)
  
  // This won't be reached, but provides a fallback in case of issues
  return (
    <div className="container py-6">Redirecting to code visualization...</div>
  )
}
