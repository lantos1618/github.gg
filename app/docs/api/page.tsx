import type { Metadata } from "next"
import Link from "next/link"
import { Code2Icon, ArrowLeftIcon } from "lucide-react"

export const metadata: Metadata = {
  title: "API Reference | GitHub.GG",
  description:
    "API documentation for GitHub.GG - access repository analysis, code visualization, and insights programmatically.",
}

export default function ApiDocsPage() {
  return (
    <div className="container max-w-6xl py-10 px-4 md:px-6">
      <Link href="/docs" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8">
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Documentation
      </Link>

      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center mb-4">
          <Code2Icon className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">API Reference</h1>
        <p className="text-xl text-muted-foreground max-w-3xl">
          Access GitHub.GG features programmatically through our comprehensive API.
        </p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-3xl font-bold mb-6 border-b pb-2">Authentication</h2>
          <p className="mb-4">To use the GitHub.GG API, you need to authenticate using an API key or OAuth token.</p>

          <h3 className="text-2xl font-semibold mb-3">API Keys</h3>
          <p className="mb-4">
            You can generate an API key in your account settings. Include the API key in the request header:
          </p>

          <div className="bg-muted p-4 rounded-md mb-6">
            <pre className="font-mono text-sm whitespace-pre-wrap">{`Authorization: Bearer YOUR_API_KEY`}</pre>
          </div>

          <h3 className="text-2xl font-semibold mb-3">OAuth Authentication</h3>
          <p className="mb-4">For applications that need to act on behalf of users, use OAuth 2.0:</p>

          <div className="bg-muted p-4 rounded-md mb-6">
            <pre className="font-mono text-sm whitespace-pre-wrap">
              {`GET https://github.gg/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=repo,user`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 border-b pb-2">Endpoints</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-semibold mb-3">Repository Analysis</h3>
              <p className="mb-4">Get detailed analysis of a repository:</p>

              <div className="bg-muted p-4 rounded-md mb-4">
                <pre className="font-mono text-sm whitespace-pre-wrap">{`GET /api/repos/:owner/:repo/analysis`}</pre>
              </div>

              <h4 className="text-lg font-semibold mb-2">Parameters</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">owner</code> - Repository owner
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">repo</code> - Repository name
                </li>
              </ul>

              <h4 className="text-lg font-semibold mb-2">Response</h4>
              <div className="bg-muted p-4 rounded-md">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {`{
  "codeQuality": {
    "score": 85,
    "issues": [
      { "type": "complexity", "count": 12, "details": "..." }
    ]
  },
  "dependencies": {
    "count": 45,
    "outdated": 3,
    "vulnerable": 1
  },
  "performance": {
    "score": 92,
    "metrics": { ... }
  }
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-3">Code Structure</h3>
              <p className="mb-4">Get the structure of a repository as a Mermaid diagram:</p>

              <div className="bg-muted p-4 rounded-md mb-4">
                <pre className="font-mono text-sm whitespace-pre-wrap">{`GET /api/repos/:owner/:repo/diagram`}</pre>
              </div>

              <h4 className="text-lg font-semibold mb-2">Parameters</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">owner</code> - Repository owner
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">repo</code> - Repository name
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">type</code> (optional) - Diagram type (directory, class,
                  dependency)
                </li>
              </ul>

              <h4 className="text-lg font-semibold mb-2">Response</h4>
              <div className="bg-muted p-4 rounded-md">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {`{
  "diagram": "graph TD;\\n  A[src] --> B[components];\\n  A --> C[pages];\\n  ...",
  "type": "directory"
}`}
                </pre>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-3">Search</h3>
              <p className="mb-4">Search within a repository:</p>

              <div className="bg-muted p-4 rounded-md mb-4">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {`GET /api/repos/:owner/:repo/search?q=:query`}
                </pre>
              </div>

              <h4 className="text-lg font-semibold mb-2">Parameters</h4>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">owner</code> - Repository owner
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">repo</code> - Repository name
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">q</code> - Search query
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">path</code> (optional) - Filter by file path
                </li>
                <li>
                  <code className="bg-card px-1 py-0.5 rounded">extension</code> (optional) - Filter by file extension
                </li>
              </ul>

              <h4 className="text-lg font-semibold mb-2">Response</h4>
              <div className="bg-muted p-4 rounded-md">
                <pre className="font-mono text-sm whitespace-pre-wrap">
                  {`{
  "results": [
    {
      "path": "src/components/Button.tsx",
      "line": 24,
      "content": "function handleClick() { ... }",
      "matches": [{ "start": 9, "end": 20 }]
    },
    ...
  ],
  "total": 15
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 border-b pb-2">Rate Limits</h2>
          <p className="mb-4">The GitHub.GG API has the following rate limits:</p>

          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>Free tier:</strong> 60 requests per hour
            </li>
            <li>
              <strong>Pro tier:</strong> 5,000 requests per hour
            </li>
            <li>
              <strong>Enterprise tier:</strong> 20,000 requests per hour
            </li>
          </ul>

          <p>Rate limit information is included in the response headers:</p>

          <div className="bg-muted p-4 rounded-md">
            <pre className="font-mono text-sm whitespace-pre-wrap">
              {`X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1635774000`}
            </pre>
          </div>
        </section>

        <section>
          <h2 className="text-3xl font-bold mb-6 border-b pb-2">Error Codes</h2>
          <p className="mb-4">The API uses standard HTTP status codes and returns detailed error messages:</p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="border border-border p-2 text-left">Status Code</th>
                  <th className="border border-border p-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-border p-2">400</td>
                  <td className="border border-border p-2">Bad Request - Invalid parameters</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">401</td>
                  <td className="border border-border p-2">Unauthorized - Authentication required</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">403</td>
                  <td className="border border-border p-2">Forbidden - Insufficient permissions</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">404</td>
                  <td className="border border-border p-2">Not Found - Resource doesn't exist</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">429</td>
                  <td className="border border-border p-2">Too Many Requests - Rate limit exceeded</td>
                </tr>
                <tr>
                  <td className="border border-border p-2">500</td>
                  <td className="border border-border p-2">Internal Server Error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="mt-12 bg-muted p-6 rounded-lg border border-border">
        <h2 className="text-xl font-bold mb-4">Need Help with the API?</h2>
        <p className="mb-4">If you have any questions or need assistance with the API, feel free to reach out:</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="https://github.com/github-gg/api-docs/issues/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
          >
            Report an API Issue
          </Link>
          <Link
            href="mailto:api-support@github.gg"
            className="inline-flex items-center gap-2 bg-card border border-border px-4 py-2 rounded-md hover:bg-muted"
          >
            Contact API Support
          </Link>
        </div>
      </div>
    </div>
  )
}
