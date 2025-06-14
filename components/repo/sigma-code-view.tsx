"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { trpc } from "@/lib/trpc/trpc"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  SearchIcon,
  FileIcon,
  FileTextIcon,
  CodeIcon,
  ImageIcon,
  Loader2Icon,
  ClipboardIcon,
  CheckIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  DownloadIcon,
} from "lucide-react"
import type { JSX } from "react"
import { Button } from "@/components/ui/button"

interface FileData {
  path: string
  content?: string
  size: number
  type: string
  isBinary?: boolean
  name: string
  sha?: string
}

interface SigmaCodeViewProps {
  files?: FileData[]
  repoData?: any
  owner?: string
  repo?: string
  branch?: string
}

export default function SigmaCodeView({ files: initialFiles = [], repoData, owner, repo, branch }: SigmaCodeViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [loadedFiles, setLoadedFiles] = useState<Record<string, FileData>>({})
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({})
  const [files, setFiles] = useState<FileData[]>(initialFiles)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [branchName] = useState(branch || repoData?.default_branch || "main")

  // Use tRPC query to fetch repository files
  const { data, isLoading: isFetching, error: fetchError, refetch } = trpc.github.getFiles.useQuery(
    {
      owner: owner || '',
      repo: repo || '',
      path: branchName,
      options: {
        maxFileSize: 1024 * 1024, // 1MB
        maxFiles: 1000,
        includeContent: true,
        includeExtensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.md'],
        excludePaths: ['**/node_modules/**', '**/dist/**', '**/build/**']
      }
    },
    {
      enabled: !!(owner && repo && initialFiles.length === 0),
      refetchOnWindowFocus: false,
      onSuccess: (data: { files?: FileData[] }) => {
        setFiles(data.files || [])
        setError(null)
      },
      onError: (error: Error & { message: string }) => {
        setError(error.message || 'Failed to load repository files')
      }
    }
  )

  // Function to reload repository files
  const loadRepoFiles = async () => {
    if (!owner || !repo) return
    await refetch()
  }

  // Set initial files if provided
  useEffect(() => {
    if (initialFiles.length > 0) {
      setFiles(initialFiles)
    }
  }, [initialFiles])

  // Filter files based on search query and active tab
  const filteredFiles = files.filter((file) => {
    // Filter by search query
    const matchesSearch =
      searchQuery === "" ||
      file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loadedFiles[file.path]?.content &&
        loadedFiles[file.path].content?.toLowerCase().includes(searchQuery.toLowerCase()))

    // Filter by file type
    if (activeTab === "all") return matchesSearch
    if (activeTab === "code" && isCodeFile(file.path)) return matchesSearch
    if (activeTab === "docs" && isDocFile(file.path)) return matchesSearch
    if (activeTab === "media" && isMediaFile(file.path)) return matchesSearch

    return false
  })

  // Calculate stats
  const totalSize = filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0)

  // Function to load file content
  const loadFileContent = async (file: FileData) => {
    if (!owner || !repo) return
    if (loadedFiles[file.path] || loadingFiles[file.path]) return

    setLoadingFiles((prev) => ({ ...prev, [file.path]: true }))

    try {
      const response = await fetch("/api/git/file-content-git", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          owner,
          repo,
          branch: branchName,
          path: file.path,
        }),
        cache: "no-store",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText} ${errorData.message || ""}`)
      }

      const data = await response.json()

      setLoadedFiles((prev) => ({
        ...prev,
        [file.path]: {
          ...file,
          content: data.isBinary ? "Binary file not shown" : data.content,
          isBinary: data.isBinary,
          size: data.size || file.size,
          sha: data.sha || file.sha,
        },
      }))
    } catch (error) {
      console.error(`Error loading file ${file.path}:`, error)
      setLoadedFiles((prev) => ({
        ...prev,
        [file.path]: {
          ...file,
          content: `Error loading file: ${error instanceof Error ? error.message : String(error)}`,
          isBinary: false,
        },
      }))
    } finally {
      setLoadingFiles((prev) => ({ ...prev, [file.path]: false }))
    }
  }

  if ((isLoading || isFetching) && files.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
        <span>Loading repository files...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <AlertCircleIcon className="h-12 w-12 text-red-500" />
          <p className="text-red-500 font-medium">Error analyzing repository</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <Button variant="outline" onClick={loadRepoFiles} className="mt-2">
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No files found in this repository.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search in files..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <CopyAllButton owner={owner!} repo={repo!} branch={branchName} />
          <div className="text-sm text-muted-foreground">
            {filteredFiles.length} files • {formatBytes(totalSize)}
          </div>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            <FileIcon className="h-4 w-4 mr-2" />
            All Files
          </TabsTrigger>
          <TabsTrigger value="code">
            <CodeIcon className="h-4 w-4 mr-2" />
            Code
          </TabsTrigger>
          <TabsTrigger value="docs">
            <FileTextIcon className="h-4 w-4 mr-2" />
            Docs
          </TabsTrigger>
          <TabsTrigger value="media">
            <ImageIcon className="h-4 w-4 mr-2" />
            Media
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <FilesList
            files={filteredFiles}
            searchQuery={searchQuery}
            loadedFiles={loadedFiles}
            loadingFiles={loadingFiles}
            onLoadFile={loadFileContent}
          />
        </TabsContent>
        <TabsContent value="code" className="mt-4">
          <FilesList
            files={filteredFiles}
            searchQuery={searchQuery}
            loadedFiles={loadedFiles}
            loadingFiles={loadingFiles}
            onLoadFile={loadFileContent}
          />
        </TabsContent>
        <TabsContent value="docs" className="mt-4">
          <FilesList
            files={filteredFiles}
            searchQuery={searchQuery}
            loadedFiles={loadedFiles}
            loadingFiles={loadingFiles}
            onLoadFile={loadFileContent}
          />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <FilesList
            files={filteredFiles}
            searchQuery={searchQuery}
            loadedFiles={loadedFiles}
            loadingFiles={loadingFiles}
            onLoadFile={loadFileContent}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function FilesList({
  files,
  searchQuery,
  loadedFiles,
  loadingFiles,
  onLoadFile,
}: {
  files: FileData[]
  searchQuery: string
  loadedFiles: Record<string, FileData>
  loadingFiles: Record<string, boolean>
  onLoadFile: (file: FileData) => void
}) {
  useEffect(() => {
    // Load content for the first 5 files automatically
    files.slice(0, 5).forEach((file) => {
      if (!loadedFiles[file.path] && !loadingFiles[file.path]) {
        onLoadFile(file)
      }
    })
  }, [files, loadedFiles, loadingFiles, onLoadFile])

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No matching files found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {files.map((file) => {
        const isLoaded = !!loadedFiles[file.path]
        const isLoading = !!loadingFiles[file.path]

        return (
          <Card key={file.path} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted p-2 border-b flex justify-between items-center">
                <h3 className="text-sm font-mono">{file.path}</h3>
                <div className="flex items-center gap-2">
                  {isLoaded && !loadedFiles[file.path]?.isBinary && (
                    <CopyButton content={loadedFiles[file.path]?.content || ""} />
                  )}
                  <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                </div>
              </div>
              <div
                className="p-4 text-xs overflow-x-auto max-h-96 font-mono"
                onClick={() => {
                  if (!isLoaded && !isLoading) {
                    onLoadFile(file)
                  }
                }}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2Icon className="h-5 w-5 animate-spin mr-2" />
                    <span>Loading file content...</span>
                  </div>
                ) : isLoaded ? (
                  <pre>
                    {highlightSearchTerms(loadedFiles[file.path].content || "Content not available", searchQuery)}
                  </pre>
                ) : (
                  <div className="text-center py-4 text-muted-foreground cursor-pointer hover:text-foreground">
                    Click to load file content
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy text: ", err)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={(e) => {
        e.stopPropagation()
        copyToClipboard()
      }}
      title="Copy code"
    >
      {copied ? (
        <>
          <CheckIcon className="h-3.5 w-3.5 mr-1" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
          <span>Copy</span>
        </>
      )}
    </Button>
  )
}

interface CopyAllButtonProps {
  owner: string
  repo: string
  branch: string
}

function CopyAllButton({ owner, repo, branch }: CopyAllButtonProps) {
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const copyAllToClipboard = async () => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/git/archive-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ owner, repo, branch }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Failed to fetch repository: ${response.status} ${response.statusText} ${errorData.message || ""}`)
      }

      const data = await response.json()
      const fileContents = data.files
        .map((file: any) => `// File: ${file.path}\n\n${file.content || ""}\n\n`)
        .join("// -----------------------------------------------\n\n")

      await navigator.clipboard.writeText(fileContents)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy all text: ", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="ml-auto"
      onClick={copyAllToClipboard}
      disabled={isLoading}
      title="Copy entire repository"
    >
      {copied ? (
        <>
          <CheckIcon className="h-4 w-4 mr-2" />
          <span>Copied All</span>
        </>
      ) : isLoading ? (
        <>
          <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
          <span>Copying...</span>
        </>
      ) : (
        <>
          <DownloadIcon className="h-4 w-4 mr-2" />
          <span>Copy All Code</span>
        </>
      )}
    </Button>
  )
}

// Helper functions
function isCodeFile(path: string): boolean {
  const codeExtensions = [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".py",
    ".rb",
    ".java",
    ".c",
    ".cpp",
    ".cs",
    ".go",
    ".php",
    ".swift",
    ".kt",
    ".rs",
    ".sh",
    ".bash",
    ".zsh",
    ".ps1",
    ".bat",
    ".cmd",
    ".sql",
  ]
  return codeExtensions.some((ext) => path.toLowerCase().endsWith(ext))
}

function isDocFile(path: string): boolean {
  const docExtensions = [
    ".md",
    ".mdx",
    ".txt",
    ".pdf",
    ".doc",
    ".docx",
    ".csv",
    ".json",
    ".yml",
    ".yaml",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".config",
    ".properties",
  ]

  // Check for common doc files without extensions
  const lowercasePath = path.toLowerCase()
  const commonDocs = ["readme", "license", "licence", "changelog", "contributing", "authors"]

  if (!lowercasePath.includes(".")) {
    const filename = lowercasePath.split("/").pop() || ""
    if (commonDocs.includes(filename)) {
      return true
    }
  }

  return docExtensions.some((ext) => path.toLowerCase().endsWith(ext))
}

function isMediaFile(path: string): boolean {
  const mediaExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp", ".mp4", ".webm", ".mp3", ".wav"]
  return mediaExtensions.some((ext) => path.toLowerCase().endsWith(ext))
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

function highlightSearchTerms(text: string, searchQuery: string): string | JSX.Element {
  if (!searchQuery || searchQuery.trim() === "") {
    return text
  }

  // Simple implementation - in a real app, you'd want to use a proper syntax highlighter
  const parts = text.split(new RegExp(`(${searchQuery})`, "gi"))

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={i} className="bg-yellow-500/30 text-white">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}
