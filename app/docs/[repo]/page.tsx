import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Star, GitFork, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock repository data
const repositories = {
  "open-reusables": {
    name: "open-reusables",
    description: "A VS Code extension to open a reusable or variable file from a help article markdown file",
    language: "JavaScript",
    languageColor: "#f1e05a",
    stars: 124,
    forks: 18,
    watchers: 5,
    readme: `# Open Reusables

A VS Code extension that allows you to quickly open reusable components or variable files referenced in markdown documentation.

## Features

- Open referenced files directly from markdown
- Support for multiple file formats
- Customizable settings
- Works with GitHub-flavored markdown

## Installation

1. Open VS Code
2. Go to Extensions
3. Search for "Open Reusables"
4. Click Install

## Usage

When viewing a markdown file that references other files in your workspace, simply hover over the file path and click the "Open" button that appears.

## Configuration

You can customize the extension behavior in your settings.json file:

\`\`\`json
{
  "openReusables.enableHover": true,
  "openReusables.supportedFileTypes": [".js", ".ts", ".jsx", ".tsx", ".css"]
}
\`\`\`

## License

MIT
`,
  },
  "simple-php-website": {
    name: "simple-php-website",
    description: "A simple and minimal website built with PHP.",
    language: "HTML",
    languageColor: "#e34c26",
    stars: 87,
    forks: 32,
    watchers: 8,
    readme: `# Simple PHP Website

A simple and minimal website built with PHP.

## Features

- Clean, simple codebase
- No dependencies
- Easy to customize
- Responsive design

## Installation

1. Clone the repository
2. Upload to your web server
3. Navigate to the site in your browser

## Structure

\`\`\`
/
├── index.php
├── about.php
├── contact.php
├── includes/
│   ├── header.php
│   ├── footer.php
│   └── functions.php
└── assets/
    ├── css/
    ├── js/
    └── images/
\`\`\`

## License

MIT
`,
  },
  "version-identifier": {
    name: "version-identifier",
    description: "A playground repo for experimenting on a new VS Code extension",
    language: "TypeScript",
    languageColor: "#3178c6",
    stars: 56,
    forks: 7,
    watchers: 3,
    readme: `# Version Identifier

A playground repository for experimenting with a new VS Code extension that helps identify and manage package versions.

## Features

- Detect version conflicts
- Suggest updates
- Track dependencies
- Visualize version relationships

## Development

This is an experimental project. To contribute:

1. Clone the repository
2. Run \`npm install\`
3. Open in VS Code
4. Press F5 to start debugging

## Project Structure

\`\`\`
/
├── src/
│   ├── extension.ts
│   ├── commands/
│   ├── utils/
│   └── providers/
├── test/
└── package.json
\`\`\`

## License

MIT
`,
  },
  "onboarding-actions": {
    name: "onboarding-actions",
    description: "GitHub Actions for repository onboarding and setup automation",
    language: "YAML",
    languageColor: "#cb171e",
    stars: 42,
    forks: 12,
    watchers: 6,
    readme: `# Onboarding Actions

A collection of GitHub Actions workflows for repository onboarding and setup automation.

## Available Actions

- **repo-setup**: Initializes repository with standard labels, branch protection, and templates
- **team-notifier**: Notifies team members when a new repository is created
- **dependency-setup**: Sets up standard dependencies and configuration
- **ci-workflow**: Adds continuous integration workflow

## Usage

Add these actions to your organization's template repositories or include them directly in your workflow:

\`\`\`yaml
name: Repository Setup
on:
  push:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: your-org/onboarding-actions/repo-setup@main
        with:
          token: \${{ secrets.GITHUB_TOKEN }}
\`\`\`

## License

MIT
`,
  },
}

export default function RepoPage({ params }: { params: { repo: string } }) {
  const repo = repositories[params.repo]

  if (!repo) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/docs">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to docs
            </Link>
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">{repo.name}</h1>
            <p className="text-muted-foreground">{repo.description}</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 text-sm">
              <Eye className="h-4 w-4" />
              <span>{repo.watchers}</span>
              <span className="text-muted-foreground">watching</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4" />
              <span>{repo.stars}</span>
              <span className="text-muted-foreground">stars</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <GitFork className="h-4 w-4" />
              <span>{repo.forks}</span>
              <span className="text-muted-foreground">forks</span>
            </div>
          </div>
        </div>

        <div className="border-b">
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="h-10 bg-transparent">
              <TabsTrigger
                value="code"
                className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent rounded-none px-4 h-10"
              >
                Code
              </TabsTrigger>
              <TabsTrigger
                value="issues"
                className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent rounded-none px-4 h-10"
              >
                Issues
              </TabsTrigger>
              <TabsTrigger
                value="pull-requests"
                className="data-[state=active]:border-b-2 data-[state=active]:border-green-500 data-[state=active]:bg-transparent rounded-none px-4 h-10"
              >
                Pull Requests
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="border rounded-lg p-6">
            <div className="prose dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: repo.readme.replace(/\n/g, "<br />") }} />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground mb-4">{repo.description}</p>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: repo.languageColor }}></span>
              <span>{repo.language}</span>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Releases</h3>
            <p className="text-sm text-muted-foreground">No releases published</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">Contributors</h3>
            <p className="text-sm text-muted-foreground">No contributors yet</p>
          </div>
        </div>
      </div>
    </div>
  )
}
