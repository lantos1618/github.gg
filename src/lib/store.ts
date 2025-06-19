import { create } from 'zustand'
import { StateCreator } from 'zustand'

interface RepoFile {
  path: string
  content: string
}

interface RepoStore {
  files: RepoFile[]
  setFiles: (files: RepoFile[]) => void
  copyAllContent: () => void
}

export const useRepoStore = create<RepoStore>((set, get): RepoStore => ({
  files: [],
  setFiles: (files: RepoFile[]) => set({ files }),
  copyAllContent: () => {
    const { files } = get()
    const allContent = files
      .map((file: RepoFile) => `// ${file.path}\n${file.content}`)
      .join('\n\n')
    navigator.clipboard.writeText(allContent)
  }
})) 