import { create } from 'zustand'
import { RepoFile } from '@/types/repo'

interface RepoData {
  files: RepoFile[]
  totalFiles: number
}

interface RepoStore {
  repos: Record<string, RepoData>
  setRepoFiles: (repoId: string, files: RepoFile[], totalFiles: number) => void
  clearRepo: (repoId: string) => void
}

export const useRepoStore = create<RepoStore>((set) => ({
  repos: {},
  setRepoFiles: (repoId, files, totalFiles) =>
    set((state) => ({
      repos: {
        ...state.repos,
        [repoId]: { files, totalFiles },
      },
    })),
  clearRepo: (repoId) =>
    set((state) => {
      const rest = Object.fromEntries(
        Object.entries(state.repos).filter(([key]) => key !== repoId)
      );
      return { repos: rest };
    }),
})) 