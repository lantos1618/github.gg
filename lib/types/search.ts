export interface SearchResult {
  id: string
  type: "repository" | "user" | "issue" | "pull-request" | "discussion"
  title: string
  description: string
  url: string
  owner: string
  avatar: string
  stars?: number
  language?: string
  updated?: string
  matchingText?: string
}

export interface SearchResponse {
  results: SearchResult[]
  totalCount: number
  page: number
  pageSize: number
  query: string
}
