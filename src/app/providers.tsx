'use client'

import { type ReactNode } from 'react'
import { create } from 'zustand'

interface RepoFile {
  path: string
  content: string
}

interface RepoStore {
  files: RepoFile[]
  isCopying: boolean
  copied: boolean
  setFiles: (files: RepoFile[]) => void
  copyAllContent: () => Promise<void>
}

export const useRepoStore = create<RepoStore>((set, get): RepoStore => ({
  files: [],
  isCopying: false,
  copied: false,
  setFiles: (files: RepoFile[]) => set({ files }),
  copyAllContent: async () => {
    set({ isCopying: true, copied: false })
    try {
      const { files } = get()
      const allContent = files
        .map((file: RepoFile) => `// ${file.path}\n${file.content}`)
        .join('\n\n')
      await navigator.clipboard.writeText(allContent)
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 800))
      set({ copied: true })
      // Reset copied state after showing tick
      setTimeout(() => set({ copied: false }), 2000)
    } finally {
      set({ isCopying: false })
    }
  }
}))

export function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>
} 