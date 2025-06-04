"use client"

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import {
  Loader2Icon,
  RefreshCwIcon,
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  FileIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { getAllRepoFiles } from "@/lib/github"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface FileNode {
  name: string
  path: string
  type: string
  size?: number
  children?: FileNode[]
}

interface RepoStructureDiagramProps {
  files: any[]
  owner: string
  repo: string
  branch: string
}

export default function RepoStructureDiagram({ files: initialFiles, owner, repo, branch }: RepoStructureDiagramProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [diagramType, setDiagramType] = useState<"flowchart" | "classDiagram" | "mindmap">("flowchart")
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [files, setFiles] = useState<any[]>(initialFiles)
  const [branchName, setBranchName] = useState(branch)
  const mermaidRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [theme, setTheme] = useState<"default" | "forest" | "dark" | "neutral">("dark")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [mermaidCode, setMermaidCode] = useState<string>("")

  // Initialize mermaid
  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: true,
        theme: theme,
        securityLevel: "loose",
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: "basis",
        },
        // Better error handling
        logLevel: 3, // Error level logs only
        errorOutputType: 3, // Error and warning messages
      })
    } catch (err) {
      console.error("Error initializing mermaid:", err)
    }
  }, [theme])

  // Fetch files if not provided
  useEffect(() => {
    async function fetchFiles() {
      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const { files: fetchedFiles, branch: fetchedBranch } = await getAllRepoFiles(owner, repo, branchName)
        setBranchName(fetchedBranch)
        setFiles(fetchedFiles)
      } catch (err) {
        console.error("Error fetching repo files:", err)
        setError("Failed to fetch repository files. Please try again.")
      } finally {
        // Don't set loading to false here, we'll do it after building the tree
      }
    }

    fetchFiles()
  }, [owner, repo, branchName, initialFiles, retryCount])

  // Build file tree from flat files array
  useEffect(() => {
    if (!files || files.length === 0) {
      if (!isLoading && !error) {
        setError("No files found in this repository.")
      }
      return
    }

    try {
      const tree: FileNode[] = []
      const map: Record<string, FileNode> = {}

      // First pass: create all nodes
      files.forEach((file) => {
        const pathParts = file.path.split("/")
        const fileName = pathParts.pop() || ""

        // Create node for this file
        const node: FileNode = {
          name: fileName,
          path: file.path,
          type: file.type || "file",
          size: file.size,
          children: [],
        }

        map[file.path] = node

        // If this is a top-level file, add it to the tree
        if (pathParts.length === 0) {
          tree.push(node)
        }
      })

      // Second pass: build the tree structure
      files.forEach((file) => {
        const pathParts = file.path.split("/")
        if (pathParts.length <= 1) return // Skip top-level files

        const fileName = pathParts.pop() || ""
        const parentPath = pathParts.join("/")

        // Find or create parent directory nodes
        let currentPath = ""
        let parentNode: FileNode | undefined

        for (const part of pathParts) {
          const prevPath = currentPath
          currentPath = currentPath ? `${currentPath}/${part}` : part

          if (!map[currentPath]) {
            // Create directory node if it doesn't exist
            const dirNode: FileNode = {
              name: part,
              path: currentPath,
              type: "directory",
              children: [],
            }
            map[currentPath] = dirNode

            // Add to parent or tree
            if (prevPath) {
              map[prevPath].children?.push(dirNode)
            } else {
              tree.push(dirNode)
            }
          }

          parentNode = map[currentPath]
        }

        // Add this file to its parent
        if (parentNode && parentNode.children) {
          const fileNode = map[file.path]
          if (fileNode && !parentNode.children.includes(fileNode)) {
            parentNode.children.push(fileNode)
          }
        }
      })

      // Sort the tree
      const sortTree = (nodes: FileNode[]) => {
        nodes.sort((a, b) => {
          // Directories first
          if (a.type === "directory" && b.type !== "directory") return -1
          if (a.type !== "directory" && b.type === "directory") return 1
          // Then alphabetically
          return a.name.localeCompare(b.name)
        })

        // Sort children recursively
        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            sortTree(node.children)
          }
        })
      }

      sortTree(tree)
      setFileTree(tree)
      setIsLoading(false)
    } catch (err) {
      console.error("Error building file tree:", err)
      setError("Failed to build repository structure")
      setIsLoading(false)
    }
  }, [files, isLoading, error])

  // Generate mermaid code based on diagram type
  useEffect(() => {
    if (isLoading || !fileTree.length) return

    try {
      let code = ""

      if (diagramType === "flowchart") {
        code = generateFlowchartDiagram(fileTree, owner, repo)
      } else if (diagramType === "classDiagram") {
        code = generateClassDiagram(fileTree, owner, repo)
      } else if (diagramType === "mindmap") {
        code = generateMindmapDiagram(fileTree, owner, repo)
      }

      setMermaidCode(code)
      setRenderError(null)
    } catch (err) {
      console.error("Error generating mermaid diagram:", err)
      setRenderError("Failed to generate diagram code")
    }
  }, [fileTree, diagramType, isLoading, owner, repo])

  // Render mermaid diagram
  useEffect(() => {
    if (!mermaidCode || !mermaidRef.current) return

    // Reset any previous content
    mermaidRef.current.innerHTML = mermaidCode

    // Add a small delay before rendering to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      try {
        mermaid.contentLoaded()
      } catch (err) {
        console.error("Error rendering mermaid diagram:", err)
        // Don't set error state here, as it might be a temporary issue
        // Instead, we'll show the mermaid error directly from its output
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [mermaidCode])

  // Apply zoom level
  useEffect(() => {
    if (mermaidRef.current) {
      const svgElement = mermaidRef.current.querySelector("svg")
      if (svgElement) {
        svgElement.style.transform = `scale(${zoomLevel / 100})`
        svgElement.style.transformOrigin = "top left"
      }
    }
  }, [zoomLevel, diagramType])

  // Handle fullscreen mode
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen().catch((err) => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`)
      })
    }
  }

  // Generate flowchart diagram
  const generateFlowchartDiagram = (tree: FileNode[], owner: string, repo: string): string => {
    // Limit the tree size for large repositories
    const limitedTree = limitTreeSize(tree, 100)

    let code = "flowchart TD\n"

    // Add styles
    code += "    %% Styles\n"

    // Updated color scheme for better visibility on dark background
    if (theme === "dark") {
      code += "    classDef directory fill:#4B0082,stroke:#9061f9,stroke-width:1px,color:#ffffff\n"
      code += "    classDef javascript fill:#8B8000,stroke:#eab308,stroke-width:1px,color:#ffffff\n"
      code += "    classDef typescript fill:#00008B,stroke:#3b82f6,stroke-width:1px,color:#ffffff\n"
      code += "    classDef react fill:#006400,stroke:#22c55e,stroke-width:1px,color:#ffffff\n"
      code += "    classDef config fill:#8B0000,stroke:#ef4444,stroke-width:1px,color:#ffffff\n"
      code += "    classDef markdown fill:#4B0082,stroke:#a855f7,stroke-width:1px,color:#ffffff\n"
      code += "    classDef json fill:#8B8000,stroke:#ca8a04,stroke-width:1px,color:#ffffff\n"
      code += "    classDef css fill:#00008B,stroke:#0ea5e9,stroke-width:1px,color:#ffffff\n"
      code += "    classDef html fill:#8B4513,stroke:#f97316,stroke-width:1px,color:#ffffff\n"
      code += "    classDef image fill:#006400,stroke:#10b981,stroke-width:1px,color:#ffffff\n"
      code += "    classDef default fill:#2F4F4F,stroke:#6b7280,stroke-width:1px,color:#ffffff\n\n"
    } else {
      code += "    classDef directory fill:#f9f0ff,stroke:#9061f9,stroke-width:1px\n"
      code += "    classDef javascript fill:#fff3c4,stroke:#eab308,stroke-width:1px\n"
      code += "    classDef typescript fill:#dbeafe,stroke:#3b82f6,stroke-width:1px\n"
      code += "    classDef react fill:#dcfce7,stroke:#22c55e,stroke-width:1px\n"
      code += "    classDef config fill:#fee2e2,stroke:#ef4444,stroke-width:1px\n"
      code += "    classDef markdown fill:#f3e8ff,stroke:#a855f7,stroke-width:1px\n"
      code += "    classDef json fill:#fef9c3,stroke:#ca8a04,stroke-width:1px\n"
      code += "    classDef css fill:#dbeafe,stroke:#0ea5e9,stroke-width:1px\n"
      code += "    classDef html fill:#ffedd5,stroke:#f97316,stroke-width:1px\n"
      code += "    classDef image fill:#d1fae5,stroke:#10b981,stroke-width:1px\n"
      code += "    classDef default fill:#f3f4f6,stroke:#6b7280,stroke-width:1px\n\n"
    }

    // Process nodes recursively
    const processNode = (node: FileNode, parentId: string | null = null, depth = 0): void => {
      // Create safe ID for mermaid
      const nodeId = `node_${node.path.replace(/[^a-zA-Z0-9]/g, "_")}`

      // Add node with proper label - escape node names with quotes
      code += `    ${nodeId}["${sanitizeMermaid(node.name)}"]\n`

      // Add class based on node type and file extension
      if (node.type === "directory") {
        code += `    class ${nodeId} directory\n`
      } else {
        const extension = node.name.split(".").pop()?.toLowerCase() || ""
        if (["js", "jsx"].includes(extension)) {
          code += `    class ${nodeId} javascript\n`
        } else if (["ts", "tsx"].includes(extension)) {
          code += `    class ${nodeId} typescript\n`
        } else if (["md", "mdx"].includes(extension)) {
          code += `    class ${nodeId} markdown\n`
        } else if (extension === "json") {
          code += `    class ${nodeId} json\n`
        } else if (["css", "scss", "less"].includes(extension)) {
          code += `    class ${nodeId} css\n`
        } else if (extension === "html") {
          code += `    class ${nodeId} html\n`
        } else if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(extension)) {
          code += `    class ${nodeId} image\n`
        } else if (["config", "env", "yml", "yaml", "toml"].includes(extension)) {
          code += `    class ${nodeId} config\n`
        }
      }

      // Add click event
      code += `    click ${nodeId} "/${owner}/${repo}/tree/${branchName}/${node.path}"\n`

      // Connect to parent
      if (parentId) {
        code += `    ${parentId} --> ${nodeId}\n`
      }

      // Process children
      if (node.children && node.children.length > 0) {
        // Limit children to prevent diagram from becoming too large
        const maxChildren = depth === 0 ? 10 : 5
        const visibleChildren = node.children.slice(0, maxChildren)

        visibleChildren.forEach((child) => {
          processNode(child, nodeId, depth + 1)
        })

        // Add indicator for hidden children
        if (node.children.length > maxChildren) {
          const hiddenCount = node.children.length - maxChildren
          const hiddenId = `${nodeId}_more`
          code += `    ${hiddenId}["... ${hiddenCount} more items"]\n`
          code += `    ${nodeId} --> ${hiddenId}\n`
          code += `    class ${hiddenId} default\n`
        }
      }
    }

    // Process top-level nodes
    const rootNodes = limitedTree.slice(0, 8) // Limit to 8 top-level nodes
    rootNodes.forEach((node) => {
      processNode(node)
    })

    // Add indicator for hidden top-level nodes
    if (limitedTree.length > 8) {
      const hiddenCount = limitedTree.length - 8
      const hiddenId = "node_more_root"
      code += `    ${hiddenId}["... ${hiddenCount} more items"]\n`
      code += `    class ${hiddenId} default\n`
    }

    return code
  }

  // Generate class diagram
  const generateClassDiagram = (tree: FileNode[], owner: string, repo: string): string => {
    // Limit the tree size for large repositories
    const limitedTree = limitTreeSize(tree, 50)

    let code = "classDiagram\n"

    // Process nodes recursively
    const processNode = (node: FileNode, parentId: string | null = null, depth = 0): void => {
      if (depth > 2) return // Limit depth to prevent diagram from becoming too complex

      // Create safe ID for mermaid
      const nodeId = `Class_${node.path.replace(/[^a-zA-Z0-9]/g, "_")}`

      // Add class with proper label
      code += `    class ${nodeId} {\n`
      code += `        ${sanitizeMermaid(node.name)}\n`

      if (node.type === "file" && node.size) {
        code += `        size: ${formatBytes(node.size)}\n`
      }

      code += `    }\n`

      // Add link
      code += `    link ${nodeId} "/${owner}/${repo}/tree/${branchName}/${node.path}"\n`

      // Connect to parent
      if (parentId) {
        code += `    ${parentId} <|-- ${nodeId}\n`
      }

      // Process children
      if (node.children && node.children.length > 0) {
        // Limit children to prevent diagram from becoming too large
        const maxChildren = 5
        const visibleChildren = node.children.slice(0, maxChildren)

        visibleChildren.forEach((child) => {
          processNode(child, nodeId, depth + 1)
        })
      }
    }

    // Process top-level nodes
    const rootNodes = limitedTree.slice(0, 5) // Limit to 5 top-level nodes
    rootNodes.forEach((node) => {
      processNode(node)
    })

    return code
  }

  // Generate mindmap diagram - fixed version with better error handling
  const generateMindmapDiagram = (tree: FileNode[], owner: string, repo: string): string => {
    // For mind maps, we need to be very careful with the structure
    // and make sure we don't use any characters that might break the syntax

    // Limit the tree size for large repositories - mind maps need to be smaller
    const limitedTree = limitTreeSize(tree, 30)

    let code = "mindmap\n"
    code += `  root((${sanitizeMermaid(repo)}))\n`

    // Safety check - make sure we have files to display
    if (limitedTree.length === 0) {
      code += `    No files\n`
      return code
    }

    // Process nodes recursively - with strict error checking
    const processNode = (node: FileNode, parentIndent: string, depth = 0): void => {
      if (depth > 2) return // Limit depth even more for mind maps

      // More restrictive for mind maps - shorter names and simpler structure
      const indent = parentIndent + "  "

      // For mind maps, we need to be extra careful with special characters
      const safeName = sanitizeMermaid(node.name).substring(0, 30) // Limit length

      // Mind maps use different node shapes - keep it simple
      const nodeSymbol = node.type === "directory" ? "]" : ")"

      // Add node with proper label - mind maps are more sensitive to syntax
      code += `${indent}${safeName}${nodeSymbol}\n`

      // Process children - but with much stricter limits
      if (node.children && node.children.length > 0 && depth < 2) {
        // Much stricter limits for mind maps
        const maxChildren = depth === 0 ? 3 : 2
        const visibleChildren = node.children
          .filter((child) => !containsSpecialChars(child.name)) // Filter out problematic names
          .slice(0, maxChildren)

        visibleChildren.forEach((child) => {
          processNode(child, indent, depth + 1)
        })

        // Add indicator for hidden children
        if (node.children.length > maxChildren) {
          const hiddenCount = node.children.length - maxChildren
          code += `${indent}  more items(${hiddenCount})\n`
        }
      }
    }

    try {
      // For mind maps, we'll just use top directories to keep it simple
      const topDirs = limitedTree.filter((node) => node.type === "directory").slice(0, 3) // Very limited for mind maps

      if (topDirs.length === 0) {
        // If no directories, show some files instead
        const topFiles = limitedTree.slice(0, 3)
        topFiles.forEach((node) => {
          const safeName = sanitizeMermaid(node.name).substring(0, 30)
          code += `  ${safeName}[\n`
        })
      } else {
        // Process top directories
        topDirs.forEach((node) => {
          const safeName = sanitizeMermaid(node.name).substring(0, 30)
          code += `  ${safeName}[\n`

          // Process immediate children with strict limits
          if (node.children) {
            const visibleChildren = node.children.filter((child) => !containsSpecialChars(child.name)).slice(0, 3)

            visibleChildren.forEach((child) => {
              const childName = sanitizeMermaid(child.name).substring(0, 25)
              const childSymbol = child.type === "directory" ? "]" : ")"
              code += `    ${childName}${childSymbol}\n`
            })

            if (node.children.length > 3) {
              code += `    more items(${node.children.length - 3})\n`
            }
          }
        })
      }

      // If more top-level items exist, note them
      if (limitedTree.length > 3) {
        code += `  more items(${limitedTree.length - 3})\n`
      }
    } catch (err) {
      // If any error occurs, fall back to a very simple mind map
      console.error("Error generating mind map:", err)
      code = "mindmap\n"
      code += `  root((${sanitizeMermaid(repo)}))\n`
      code += `  Files and Directories\n`
      code += `    Too complex to render\n`
      code += `    Try Flowchart view\n`
    }

    return code
  }

  // Utility to check for special characters that break mind maps
  const containsSpecialChars = (str: string): boolean => {
    const problematicChars = /[()[\]{}:;,]/
    return problematicChars.test(str)
  }

  // Utility to sanitize strings for mermaid syntax
  const sanitizeMermaid = (str: string): string => {
    // Replace characters that can break mermaid syntax
    return str.replace(/["]/g, "'").replace(/[<>]/g, "").replace(/[\\]/g, "/")
  }

  // Helper function to limit tree size for large repositories
  const limitTreeSize = (tree: FileNode[], maxNodes: number): FileNode[] => {
    // If tree is already small enough, return it as is
    let totalNodes = countNodes(tree)
    if (totalNodes <= maxNodes) return tree

    // Otherwise, limit the tree
    const result = [...tree]

    // First, remove deep nested structures
    const pruneDepth = (nodes: FileNode[], maxDepth: number, currentDepth = 0): void => {
      if (currentDepth >= maxDepth) {
        nodes.forEach((node) => {
          node.children = []
        })
        return
      }

      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          pruneDepth(node.children, maxDepth, currentDepth + 1)
        }
      })
    }

    // Start with a reasonable depth
    const maxDepth = 3
    pruneDepth(result, maxDepth)

    // If still too large, reduce breadth
    totalNodes = countNodes(result)
    if (totalNodes > maxNodes) {
      const limitBreadth = (nodes: FileNode[], maxChildren: number): void => {
        if (nodes.length > maxChildren) {
          nodes.splice(maxChildren)
        }

        nodes.forEach((node) => {
          if (node.children && node.children.length > 0) {
            limitBreadth(node.children, maxChildren)
          }
        })
      }

      limitBreadth(result, 5)
    }

    return result
  }

  // Helper function to count total nodes in a tree
  const countNodes = (tree: FileNode[]): number => {
    let count = tree.length

    tree.forEach((node) => {
      if (node.children && node.children.length > 0) {
        count += countNodes(node.children)
      }
    })

    return count
  }

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Refresh diagram
  const refreshDiagram = () => {
    setIsLoading(true)
    setRenderError(null)
    setRetryCount((prev) => prev + 1)
  }

  // Handle diagram type change
  const handleDiagramTypeChange = (value: string) => {
    setRenderError(null)
    setDiagramType(value as "flowchart" | "classDiagram" | "mindmap")
    // No need to call refreshDiagram() as the useEffect will handle the update
  }

  // Handle theme change
  const handleThemeChange = (value: "default" | "forest" | "dark" | "neutral") => {
    setTheme(value)
    // The useEffect will handle the update
  }

  // Fix errors in mind map
  const fixMindMapErrors = () => {
    // For mind maps, we'll create a simplified version that's less likely to break
    setIsLoading(true)

    // Create a very simple tree with only top-level directories
    const simplifiedTree = fileTree
      .filter((node) => node.type === "directory")
      .slice(0, 5)
      .map((node) => ({
        ...node,
        name: node.name.replace(/[^a-zA-Z0-9\s-]/g, ""), // Remove special characters
        children: [],
      }))

    setFileTree(simplifiedTree)
    setTimeout(() => {
      setIsLoading(false)
    }, 100)
  }

  // Show simplified diagram for large repositories
  const showSimplifiedDiagram = () => {
    // Create a simplified tree with just top-level directories
    const simplified = fileTree
      .filter((node) => node.type === "directory")
      .slice(0, 10)
      .map((node) => ({
        ...node,
        children: node.children
          ? node.children
              .filter((child) => child.type === "directory")
              .slice(0, 5)
              .map((child) => ({ ...child, children: [] }))
          : [],
      }))

    setFileTree(simplified)
  }

  // Detect mermaid rendering errors
  useEffect(() => {
    if (mermaidRef.current) {
      // Check if there's an error displayed by mermaid
      const errorElement = mermaidRef.current.querySelector(".error-icon, .error-text")

      // Check for syntax error text nodes using proper DOM methods
      let hasErrorText = false
      const textElements = mermaidRef.current.querySelectorAll("text")
      textElements.forEach((textEl) => {
        if (textEl.textContent && textEl.textContent.includes("Syntax error")) {
          hasErrorText = true
        }
      })

      if (errorElement || hasErrorText) {
        setRenderError("There was an error rendering the diagram.")
      }
    }
  }, [mermaidCode])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mermaid Diagram</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2Icon className="h-8 w-8 animate-spin mr-3" />
          <span>Generating Mermaid diagram...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mermaid Diagram</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-red-500 font-medium">{error}</p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="outline" onClick={refreshDiagram}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            {fileTree.length > 0 && (
              <Button variant="outline" onClick={showSimplifiedDiagram}>
                <FileIcon className="h-4 w-4 mr-2" />
                Show Simplified Diagram
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isFullscreen ? "fixed inset-0 z-50 rounded-none" : ""}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Mermaid Diagram</CardTitle>
        <div className="flex items-center gap-2">
          <Tabs value={diagramType} onValueChange={handleDiagramTypeChange}>
            <TabsList>
              <TabsTrigger value="flowchart">Flowchart</TabsTrigger>
              <TabsTrigger value="classDiagram">Class Diagram</TabsTrigger>
              <TabsTrigger value="mindmap">Mind Map</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={theme} onValueChange={(value) => handleThemeChange(value as any)}>
            <TabsList>
              <TabsTrigger value="dark">Dark</TabsTrigger>
              <TabsTrigger value="default">Light</TabsTrigger>
              <TabsTrigger value="forest">Forest</TabsTrigger>
              <TabsTrigger value="neutral">Neutral</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {renderError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error rendering diagram</AlertTitle>
            <AlertDescription>
              {renderError}
              {diagramType === "mindmap" && (
                <Button variant="outline" size="sm" onClick={fixMindMapErrors} className="ml-4">
                  Fix Mind Map
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              disabled={zoomLevel <= 50}
            >
              <ZoomOutIcon className="h-4 w-4" />
            </Button>
            <div className="w-32">
              <Slider
                value={[zoomLevel]}
                min={50}
                max={200}
                step={10}
                onValueChange={(value) => setZoomLevel(value[0])}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
              disabled={zoomLevel >= 200}
            >
              <ZoomInIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm ml-2">{zoomLevel}%</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshDiagram}>
              <RefreshCwIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <MinimizeIcon className="h-4 w-4" /> : <MaximizeIcon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="mermaid-container overflow-auto border rounded-md p-4 bg-black"
          style={{
            maxHeight: isFullscreen ? "calc(100vh - 200px)" : "600px",
            height: isFullscreen ? "calc(100vh - 200px)" : "auto",
          }}
        >
          <div ref={mermaidRef} className="mermaid" style={{ minWidth: "100%", display: "inline-block" }}></div>
        </div>
      </CardContent>
    </Card>
  )
}
