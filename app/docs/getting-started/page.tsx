import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function GettingStartedPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to start using GitHub.GG to enhance your GitHub experience.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">How to Access GitHub.GG</h2>
        <p className="leading-7">
          GitHub.GG is a web-based tool that enhances your GitHub experience. You don't need to install anything -
          simply use our domain instead of the regular GitHub domain.
        </p>

        <div className="my-6 p-4 border rounded-md bg-muted">
          <h3 className="text-lg font-medium mb-2">URL Pattern</h3>
          <p className="font-mono mb-4">https://github.gg/owner/repository</p>

          <h3 className="text-lg font-medium mb-2">Example</h3>
          <p className="font-mono">https://github.gg/facebook/react</p>
        </div>

        <p className="leading-7">
          This will take you to our enhanced view of the repository with all GitHub.GG features available.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Repository Navigation</h2>
        <p className="leading-7">Once you're viewing a repository on GitHub.GG, you'll see our enhanced navigation:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Code:</strong> Browse the repository files with our enhanced code viewer
          </li>
          <li>
            <strong>Diagram:</strong> View Mermaid diagrams of the repository structure
          </li>
          <li>
            <strong>Sigma:</strong> Explore the codebase with our advanced code navigation tool
          </li>
          <li>
            <strong>Issues:</strong> View and manage repository issues
          </li>
          <li>
            <strong>Pull Requests:</strong> Review and manage pull requests
          </li>
          <li>
            <strong>Actions:</strong> View GitHub Actions workflows
          </li>
          <li>
            <strong>Security:</strong> Access our enhanced security analysis
          </li>
          <li>
            <strong>Insights:</strong> Get detailed analytics about the repository
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Next Steps</h2>
        <p className="leading-7">
          Now that you know how to access GitHub.GG, explore these guides to learn more about specific features:
        </p>

        <ul className="space-y-2">
          <li>
            <Link href="/docs/features/code-browser" className="text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="h-4 w-4" />
              Using the Enhanced Code Browser
            </Link>
          </li>
          <li>
            <Link
              href="/docs/features/mermaid-diagrams"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <ArrowRight className="h-4 w-4" />
              Working with Mermaid Diagrams
            </Link>
          </li>
          <li>
            <Link
              href="/docs/features/sigma-code-view"
              className="text-primary hover:underline flex items-center gap-1"
            >
              <ArrowRight className="h-4 w-4" />
              Exploring Code with Sigma View
            </Link>
          </li>
          <li>
            <Link href="/docs/search/basic-search" className="text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="h-4 w-4" />
              Using Advanced Search Features
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
