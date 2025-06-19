import { create } from 'zustand'
import { StateCreator } from 'zustand'
import { RepoFile } from '@/types/repo'

interface RepoStore {
  files: RepoFile[]
  totalFiles: number
  setFiles: (files: RepoFile[], totalFiles: number) => void
  copyAllContent: () => void
  isCopying: boolean
  copied: boolean
  setIsCopying: (isCopying: boolean) => void
  setCopied: (copied: boolean) => void
}

export const useRepoStore = create<RepoStore>((set, get): RepoStore => ({
  files: [],
  totalFiles: 0,
  isCopying: false,
  copied: false,
  setFiles: (files: RepoFile[], totalFiles: number) => set({ files, totalFiles }),
  setIsCopying: (isCopying: boolean) => set({ isCopying }),
  setCopied: (copied: boolean) => set({ copied }),
  copyAllContent: async () => {
    const { files, setIsCopying, setCopied } = get()
    setIsCopying(true)
    setCopied(false)
    
    try {
      const allContent = files
        .map((file: RepoFile) => `// ${file.path}\n${file.content}`)
        .join('\n\n')
      await navigator.clipboard.writeText(allContent)
      setCopied(true)
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
    } finally {
      setIsCopying(false)
    }
  }
})) 