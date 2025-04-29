"use client"

import Link from "next/link"
import { FolderIcon, FileIcon } from "lucide-react"

interface RepoFileTreeProps {
  username: string
  reponame: string
  branch: string
  path: string
  repoData: any
  treeData: any[]
}

export default function RepoFileTree({ username, reponame, branch, path, repoData, treeData }: RepoFileTreeProps) {
  // Helper to build the path for navigation
  const buildPath = (itemPath: string, isFile = false) => {
    return `/${username}/${reponame}/${isFile ? "blob" : "tree"}/${branch}/${itemPath}`
  }

  return (
    <div className="space-y-3">
      {treeData.map((item) => (
        <div key={item.path} className="flex items-center gap-2">
          {item.type === "dir" ? (
            <>
              <FolderIcon className="h-4 w-4 text-blue-400" />
              <Link href={buildPath(item.path)} className="text-sm hover:text-blue-400 transition-colors">
                {item.name}
              </Link>
            </>
          ) : (
            <>
              <FileIcon className="h-4 w-4 text-gray-400" />
              <Link href={buildPath(item.path, true)} className="text-sm hover:text-blue-400 transition-colors">
                {item.name}
              </Link>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
