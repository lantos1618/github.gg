import { create } from 'zustand'
import { RepoFile } from '@/types/repo'
import { toast } from 'sonner'

interface RepoStore {
  // Data
  files: RepoFile[]
  totalFiles: number
  
  // Actions
  setFiles: (files: RepoFile[], totalFiles: number) => void
  copyAllContent: () => Promise<void>
  
  // Copy states
  isCopying: boolean
  copied: boolean
  setIsCopying: (isCopying: boolean) => void
  setCopied: (copied: boolean) => void
}

// Maximum content size in characters (10MB equivalent)
const MAX_COPY_SIZE = 10 * 1024 * 1024;

export const useRepoStore = create<RepoStore>((set, get): RepoStore => ({
  // Initial state
  files: [],
  totalFiles: 0,
  isCopying: false,
  copied: false,

  // Actions
  setFiles: (files: RepoFile[], totalFiles: number) => set({ files, totalFiles }),
  setIsCopying: (isCopying: boolean) => set({ isCopying }),
  setCopied: (copied: boolean) => set({ copied }),

  copyAllContent: async () => {
    const { files, setIsCopying, setCopied } = get()
    setIsCopying(true)
    setCopied(false)
    
    try {
      // Calculate total content size
      const totalSize = files.reduce((size, file) => size + file.content.length + file.path.length + 10, 0);
      
      if (totalSize > MAX_COPY_SIZE) {
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        throw new Error(`Content too large (${sizeInMB}MB). Maximum size is ${MAX_COPY_SIZE / (1024 * 1024)}MB.`);
      }

      const allContent = files
        .map((file: RepoFile) => `// ${file.path}\n${file.content}`)
        .join('\n\n')
      await navigator.clipboard.writeText(allContent)
      setCopied(true)
      toast.success('All content copied to clipboard!')
      
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy content:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to copy content')
    } finally {
      setIsCopying(false)
    }
  }
})) 