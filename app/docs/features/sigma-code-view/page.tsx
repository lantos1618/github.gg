export default function SigmaCodeViewPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Sigma Code View</h1>
        <p className="text-xl text-muted-foreground">
          Explore and navigate codebases with our interactive code visualization tool.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="leading-7">
          Sigma Code View is GitHub.GG's advanced code exploration tool that helps you understand complex codebases by
          visualizing relationships between files, functions, and classes. It provides an interactive interface for
          navigating code and understanding dependencies.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Accessing Sigma Code View</h2>
        <p className="leading-7">To access the Sigma Code View for a repository:</p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Navigate to any repository using the GitHub.GG domain (e.g.,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded-md">https://github.gg/facebook/react</code>)
          </li>
          <li>Click on the "Sigma" tab in the repository navigation</li>
          <li>The Sigma Code View will load and analyze the repository</li>
        </ol>

        <div className="my-6 border rounded-md overflow-hidden">
          <div className="bg-muted p-4 border-b">
            <p className="font-medium">Example Sigma Code View</p>
          </div>
          <div className="p-4 bg-background">
            <div className="aspect-video relative bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Sigma Code View placeholder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Key Features</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Interactive Code Navigation</h3>
            <p className="leading-7">
              Click on files, functions, or classes to navigate through the codebase. The visualization updates to show
              relationships and dependencies for the selected item.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Dependency Visualization</h3>
            <p className="leading-7">
              See which files import or are imported by the current file, helping you understand the impact of changes.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Function Call Graphs</h3>
            <p className="leading-7">
              Visualize which functions call other functions, making it easier to trace execution paths.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Code Search</h3>
            <p className="leading-7">
              Search for specific functions, classes, or patterns within the codebase and see results in context.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Syntax Highlighting</h3>
            <p className="leading-7">Code is displayed with full syntax highlighting for better readability.</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Navigation Controls</h2>
        <p className="leading-7">The Sigma Code View provides several controls for navigating and exploring code:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Zoom:</strong> Use the mouse wheel or pinch gestures to zoom in and out
          </li>
          <li>
            <strong>Pan:</strong> Click and drag to move around the visualization
          </li>
          <li>
            <strong>Select:</strong> Click on nodes to select files or functions
          </li>
          <li>
            <strong>Expand/Collapse:</strong> Toggle visibility of dependencies
          </li>
          <li>
            <strong>Search:</strong> Use the search bar to find specific elements
          </li>
          <li>
            <strong>Filter:</strong> Filter by file type, directory, or other criteria
          </li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Use Cases</h2>
        <p className="leading-7">Sigma Code View is particularly useful for:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Understanding unfamiliar codebases</li>
          <li>Tracing execution paths through complex systems</li>
          <li>Identifying tightly coupled components</li>
          <li>Planning refactoring efforts</li>
          <li>Documenting code architecture</li>
          <li>Onboarding new team members</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Performance Considerations</h2>
        <p className="leading-7">
          For large repositories, the Sigma Code View may take some time to load as it analyzes the codebase. For
          optimal performance:
        </p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Start with a specific directory rather than the entire repository</li>
          <li>Use filters to focus on relevant parts of the codebase</li>
          <li>Consider using a modern browser with good WebGL support</li>
          <li>For very large repositories, consider analyzing specific branches or tags</li>
        </ul>
      </div>
    </div>
  )
}
