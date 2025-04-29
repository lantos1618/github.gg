export default function BasicSearchPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Basic Search</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to use GitHub.GG's powerful search capabilities to find code and content.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Using the Search Bar</h2>
        <p className="leading-7">
          GitHub.GG provides an enhanced search experience compared to standard GitHub. To start searching:
        </p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>Click on the search bar at the top of any GitHub.GG page</li>
          <li>Enter your search query</li>
          <li>Press Enter or click the search icon</li>
        </ol>

        <div className="my-6 border rounded-md overflow-hidden">
          <div className="bg-muted p-4 border-b">
            <p className="font-medium">Search Bar Location</p>
          </div>
          <div className="p-4 bg-background">
            <div className="aspect-video relative bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Search bar screenshot placeholder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Search Syntax</h2>
        <p className="leading-7">
          GitHub.GG supports a variety of search operators to help you find exactly what you're looking for:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border px-4 py-2 text-left">Operator</th>
                <th className="border px-4 py-2 text-left">Description</th>
                <th className="border px-4 py-2 text-left">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2 font-mono">filename:</td>
                <td className="border px-4 py-2">Search for files with a specific name or extension</td>
                <td className="border px-4 py-2 font-mono">filename:*.js</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">path:</td>
                <td className="border px-4 py-2">Search within a specific directory path</td>
                <td className="border px-4 py-2 font-mono">path:src/components</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">language:</td>
                <td className="border px-4 py-2">Search for code in a specific language</td>
                <td className="border px-4 py-2 font-mono">language:typescript</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">repo:</td>
                <td className="border px-4 py-2">Search within a specific repository</td>
                <td className="border px-4 py-2 font-mono">repo:facebook/react</td>
              </tr>
              <tr>
                <td className="border px-4 py-2 font-mono">user:</td>
                <td className="border px-4 py-2">Search repositories owned by a specific user</td>
                <td className="border px-4 py-2 font-mono">user:facebook</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="leading-7 mt-4">You can combine these operators to create more specific searches:</p>

        <div className="bg-muted p-4 rounded-md my-4">
          <p className="font-mono text-sm">useState language:typescript path:src/hooks</p>
        </div>

        <p className="leading-7">
          This would search for "useState" in TypeScript files within the src/hooks directory.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Search Results</h2>
        <p className="leading-7">
          Search results in GitHub.GG are organized to help you quickly find what you're looking for:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Code Results:</strong> Matching code snippets with syntax highlighting
          </li>
          <li>
            <strong>File Results:</strong> Files that match your search criteria
          </li>
          <li>
            <strong>Repository Results:</strong> Repositories that match your search
          </li>
          <li>
            <strong>Issue Results:</strong> Issues that contain your search terms
          </li>
          <li>
            <strong>Pull Request Results:</strong> Pull requests that match your search
          </li>
        </ul>

        <p className="leading-7 mt-4">
          Results are ranked by relevance, with the most relevant matches appearing first.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Search Filters</h2>
        <p className="leading-7">After performing a search, you can further refine your results using filters:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Language:</strong> Filter by programming language
          </li>
          <li>
            <strong>File Type:</strong> Filter by file extension
          </li>
          <li>
            <strong>Repository:</strong> Filter by repository
          </li>
          <li>
            <strong>User:</strong> Filter by user
          </li>
          <li>
            <strong>Date Range:</strong> Filter by when the code was committed
          </li>
        </ul>

        <p className="leading-7 mt-4">These filters appear in the sidebar of the search results page.</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Next Steps</h2>
        <p className="leading-7">
          Now that you understand the basics of searching in GitHub.GG, you might want to explore:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <a href="/docs/search/advanced-filters" className="text-primary hover:underline">
              Advanced Filters
            </a>{" "}
            - Learn about more sophisticated filtering options
          </li>
          <li>
            <a href="/docs/search/regex-search" className="text-primary hover:underline">
              Regex Search
            </a>{" "}
            - Use regular expressions for powerful pattern matching
          </li>
          <li>
            <a href="/docs/features/code-browser" className="text-primary hover:underline">
              Code Browser
            </a>{" "}
            - Navigate search results in context
          </li>
        </ul>
      </div>
    </div>
  )
}
