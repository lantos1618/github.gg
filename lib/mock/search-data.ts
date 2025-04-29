import type { SearchResult } from "../types/search"

export const mockSearchResults: SearchResult[] = [
  {
    id: "1",
    type: "repository",
    title: "facebook/react",
    description: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
    url: "/facebook/react",
    owner: "facebook",
    avatar: "/social-network-connections.png",
    stars: 203456,
    language: "JavaScript",
    updated: "2023-04-15",
    matchingText: "React is a JavaScript library for building user interfaces",
  },
  {
    id: "2",
    type: "repository",
    title: "vercel/next.js",
    description: "The React Framework for the Web",
    url: "/vercel/next.js",
    owner: "vercel",
    avatar: "/modern-web-deployment.png",
    stars: 98765,
    language: "TypeScript",
    updated: "2023-04-18",
    matchingText: "Next.js gives you the best developer experience",
  },
  {
    id: "3",
    type: "repository",
    title: "tinyplex/tinybase",
    description: "The reactive data store for local-first apps",
    url: "/tinyplex/tinybase",
    owner: "tinyplex",
    avatar: "/abstract-tinyplex.png",
    stars: 4321,
    language: "TypeScript",
    updated: "2023-04-10",
    matchingText: "TinyBase is a reactive data store for local-first apps",
  },
  {
    id: "4",
    type: "user",
    title: "gaearon",
    description: "Working on @reactjs. Co-author of Redux and Create React App. Building tools for humans.",
    url: "/gaearon",
    owner: "gaearon",
    avatar: "/thoughtful-developer.png",
    matchingText: "Dan Abramov - Working on React",
  },
  {
    id: "5",
    type: "issue",
    title: "Memory leak in useEffect cleanup",
    description: "Issue #23456 opened 2 days ago by user123",
    url: "/facebook/react/issues/23456",
    owner: "facebook/react",
    avatar: "/tangled-threads.png",
    updated: "2023-04-17",
    matchingText: "When using useEffect with async operations, there's a memory leak",
  },
]

export function searchMockData(query: string): SearchResult[] {
  if (!query || query.trim() === "") return []

  const normalizedQuery = query.toLowerCase().trim()

  return mockSearchResults.filter((result) => {
    return (
      result.title.toLowerCase().includes(normalizedQuery) ||
      result.description.toLowerCase().includes(normalizedQuery) ||
      (result.matchingText && result.matchingText.toLowerCase().includes(normalizedQuery)) ||
      (result.language && result.language.toLowerCase().includes(normalizedQuery)) ||
      result.owner.toLowerCase().includes(normalizedQuery)
    )
  })
}
