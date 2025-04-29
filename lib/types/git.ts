export interface GitFile {
  path: string
  name: string
  size: number
  type: string
  content?: string
  isBinary?: boolean
  sha?: string
}

export interface GitRepoAnalysis {
  files: GitFile[]
  fileCount: number
  directoryCount: number
  defaultBranch?: string
  readme?: string
  analysisTimeMs: number
  isPublic: boolean
  languages?: Record<string, number>
}

export interface GitFileContent {
  content: string
  isBinary: boolean
  size: number
  name: string
  sha?: string
}
