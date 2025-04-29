import { redirect } from "next/navigation"

export default function RepoPage({ params }: { params: { user: string; repo: string } }) {
  const { user, repo } = params

  // Use a more resilient approach for redirection
  if (typeof window === "undefined") {
    // Server-side: use redirect
    redirect(`/${user}/${repo}/sigma`)
  } else {
    // Client-side: use window.location for direct navigation
    window.location.href = `/${user}/${repo}/sigma`
    // Return a loading state while redirecting
    return <div className="container py-6">Redirecting to code visualization...</div>
  }
}
