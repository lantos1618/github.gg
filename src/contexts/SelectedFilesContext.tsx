'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { RepoFile } from '@/types/repo';

interface SelectedFilesContextValue {
  selectedFilePaths: Set<string>;
  toggleFile: (filePath: string) => void;
  selectAll: (filePaths: string[]) => void;
  deselectAll: () => void;
  isFileSelected: (filePath: string) => boolean;
  selectedCount: number;
}

const SelectedFilesContext = createContext<SelectedFilesContextValue | undefined>(undefined);

interface SelectedFilesProviderProps {
  children: ReactNode;
  files?: RepoFile[];
}

export function SelectedFilesProvider({ children, files = [] }: SelectedFilesProviderProps) {
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());

  // Auto-select all files when files load
  useEffect(() => {
    if (files && files.length > 0) {
      setSelectedFilePaths(new Set(files.map(f => f.path)));
    }
  }, [files]);

  const toggleFile = useCallback((filePath: string) => {
    setSelectedFilePaths(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((filePaths: string[]) => {
    setSelectedFilePaths(new Set(filePaths));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedFilePaths(new Set());
  }, []);

  const isFileSelected = useCallback((filePath: string) => {
    return selectedFilePaths.has(filePath);
  }, [selectedFilePaths]);

  const value: SelectedFilesContextValue = {
    selectedFilePaths,
    toggleFile,
    selectAll,
    deselectAll,
    isFileSelected,
    selectedCount: selectedFilePaths.size,
  };

  return (
    <SelectedFilesContext.Provider value={value}>
      {children}
    </SelectedFilesContext.Provider>
  );
}

export function useSelectedFiles() {
  const context = useContext(SelectedFilesContext);
  if (context === undefined) {
    throw new Error('useSelectedFiles must be used within a SelectedFilesProvider');
  }
  return context;
}
