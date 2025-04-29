export default function MermaidDiagramsPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Mermaid Diagrams</h1>
        <p className="text-xl text-muted-foreground">
          Visualize repository structure and relationships with automatically generated Mermaid diagrams.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="leading-7">
          GitHub.GG automatically generates Mermaid diagrams to help you understand the structure and relationships
          within a repository. These diagrams provide visual representations of directory structures, component
          relationships, and code dependencies.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Accessing Diagrams</h2>
        <p className="leading-7">To view the Mermaid diagrams for a repository:</p>

        <ol className="list-decimal pl-6 space-y-2">
          <li>
            Navigate to any repository using the GitHub.GG domain (e.g.,{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded-md">https://github.gg/facebook/react</code>)
          </li>
          <li>Click on the "Diagram" tab in the repository navigation</li>
          <li>The diagram will be automatically generated and displayed</li>
        </ol>

        <div className="my-6 border rounded-md overflow-hidden">
          <div className="bg-muted p-4 border-b">
            <p className="font-medium">Example Diagram View</p>
          </div>
          <div className="p-4 bg-background">
            <div className="aspect-video relative bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Diagram preview placeholder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Types of Diagrams</h2>
        <p className="leading-7">
          GitHub.GG generates several types of diagrams to help you understand different aspects of a repository:
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold">Directory Structure</h3>
            <p className="leading-7">
              Visualizes the folder and file organization of the repository, helping you understand the project layout.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Component Relationships</h3>
            <p className="leading-7">
              Shows how different components or classes in the codebase relate to each other, including inheritance and
              composition relationships.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Dependency Graphs</h3>
            <p className="leading-7">
              Illustrates the dependencies between different modules or packages in the project.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold">Flow Charts</h3>
            <p className="leading-7">
              For certain types of code, GitHub.GG can generate flow charts that show the logical flow of operations.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Interacting with Diagrams</h2>
        <p className="leading-7">The Mermaid diagrams in GitHub.GG are interactive:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Hover over nodes to highlight relationships</li>
          <li>Click on nodes to focus on specific components</li>
          <li>Zoom in and out to explore complex diagrams</li>
          <li>Pan around to navigate large diagrams</li>
          <li>Export diagrams as SVG or PNG files</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Customizing Diagrams</h2>
        <p className="leading-7">You can customize the generated diagrams in several ways:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Change the diagram type (flowchart, class diagram, etc.)</li>
          <li>Adjust the layout direction (top-down, left-right, etc.)</li>
          <li>Filter components to focus on specific parts of the codebase</li>
          <li>Change the theme to match your preferences</li>
        </ul>

        <p className="leading-7 mt-4">
          To access these customization options, look for the settings icon in the top-right corner of the diagram view.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Use Cases</h2>
        <p className="leading-7">Mermaid diagrams are particularly useful for:</p>

        <ul className="list-disc pl-6 space-y-2">
          <li>Onboarding new team members to a codebase</li>
          <li>Planning refactoring efforts</li>
          <li>Identifying architectural issues</li>
          <li>Documenting code structure</li>
          <li>Understanding complex dependencies</li>
        </ul>
      </div>
    </div>
  )
}
