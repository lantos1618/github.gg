import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import Image from "next/image"

// Mock trending repositories data
const trendingRepos = [
  {
    id: 1,
    name: "vercel/next.js",
    description: "The React Framework for the Web",
    stars: 112500,
    forks: 24800,
    language: "TypeScript",
    languageColor: "#3178c6",
  },
  {
    id: 2,
    name: "facebook/react",
    description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
    stars: 213000,
    forks: 44200,
    language: "JavaScript",
    languageColor: "#f1e05a",
  },
  {
    id: 3,
    name: "microsoft/vscode",
    description: "Visual Studio Code",
    stars: 149000,
    forks: 26300,
    language: "TypeScript",
    languageColor: "#3178c6",
  },
  {
    id: 4,
    name: "tailwindlabs/tailwindcss",
    description: "A utility-first CSS framework for rapid UI development.",
    stars: 73400,
    forks: 3900,
    language: "CSS",
    languageColor: "#563d7c",
  },
  {
    id: 5,
    name: "denoland/deno",
    description: "A modern runtime for JavaScript and TypeScript.",
    stars: 89700,
    forks: 4800,
    language: "Rust",
    languageColor: "#dea584",
  },
  {
    id: 6,
    name: "sveltejs/svelte",
    description: "Cybernetically enhanced web apps",
    stars: 71900,
    forks: 3800,
    language: "TypeScript",
    languageColor: "#3178c6",
  },
]

// Mock featured topics data
const featuredTopics = [
  { id: 1, name: "react", repos: 1250000, description: "React is a JavaScript library for building user interfaces" },
  {
    id: 2,
    name: "typescript",
    repos: 980000,
    description: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript",
  },
  { id: 3, name: "nextjs", repos: 420000, description: "Next.js is a React framework for production" },
  { id: 4, name: "tailwindcss", repos: 310000, description: "A utility-first CSS framework for rapid UI development" },
  { id: 5, name: "ai", repos: 280000, description: "Artificial intelligence and machine learning projects" },
  { id: 6, name: "web-development", repos: 1800000, description: "Web development frameworks, libraries, and tools" },
]

export default function ExplorePage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Explore GitHub</h1>

      <Tabs defaultValue="trending" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="trending">Trending</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="trending">
          <div className="grid gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Trending Repositories</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Today
                </Button>
                <Button variant="outline" size="sm">
                  This week
                </Button>
                <Button variant="outline" size="sm">
                  This month
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {trendingRepos.map((repo) => (
                <Card key={repo.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link href={`/${repo.name}`} className="text-lg font-medium hover:underline">
                          {repo.name}
                        </Link>
                        <CardDescription className="mt-1">{repo.description}</CardDescription>
                      </div>
                      <Button variant="outline" size="sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M12 4V20M12 4L8 8M12 4L16 8" />
                        </svg>
                        Star
                      </Button>
                    </div>
                  </CardHeader>
                  <CardFooter className="pt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <span
                          className="inline-block w-3 h-3 rounded-full mr-1"
                          style={{ backgroundColor: repo.languageColor }}
                        ></span>
                        {repo.language}
                      </div>
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" />
                        </svg>
                        {repo.stars.toLocaleString()}
                      </div>
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="M7 7c.3 -3.1 3.5 -5 6.5 -5c.5 0 .5 2 0 2c-2.5 0 -4.5 1.5 -4.5 4c0 2 1.4 3 3 4l2 1" />
                          <path d="M17 17c-.3 3.1 -3.5 5 -6.5 5c-.5 0 -.5 -2 0 -2c2.5 0 4.5 -1.5 4.5 -4c0 -2 -1.4 -3 -3 -4l-2 -1" />
                        </svg>
                        {repo.forks.toLocaleString()}
                      </div>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="topics">
          <div className="grid gap-6">
            <h2 className="text-xl font-semibold">Featured Topics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredTopics.map((topic) => (
                <Card key={topic.id} className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <Link href={`/topics/${topic.name}`} className="text-blue-500 hover:underline">
                        #{topic.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>{topic.repos.toLocaleString()} repositories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{topic.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="collections">
          <div className="grid gap-6">
            <h2 className="text-xl font-semibold">Collections</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src="/social-network-connections.png"
                    alt="Machine Learning Collection"
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>Machine Learning Tools</CardTitle>
                  <CardDescription>Essential libraries and frameworks for ML</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">tensorflow</Badge>
                    <Badge variant="secondary">pytorch</Badge>
                    <Badge variant="secondary">scikit-learn</Badge>
                    <Badge variant="secondary">huggingface</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Collection
                  </Button>
                </CardFooter>
              </Card>

              <Card className="overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src="/modern-web-deployment.png"
                    alt="Web Development Collection"
                    fill
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <CardTitle>Modern Web Development</CardTitle>
                  <CardDescription>Top frameworks for building web applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">react</Badge>
                    <Badge variant="secondary">next.js</Badge>
                    <Badge variant="secondary">vue</Badge>
                    <Badge variant="secondary">svelte</Badge>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Collection
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
