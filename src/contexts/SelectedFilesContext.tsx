'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useMemo } from 'react';
import type { RepoFile } from '@/types/repo';

interface SelectedFilesContextValue {
  selectedFilePaths: Set<string>;
  toggleFile: (filePath: string) => void;
  selectAll: (filePaths: string[]) => void;
  deselectAll: () => void;
  isFileSelected: (filePath: string) => boolean;
  selectedCount: number;
  maxFileSize: number;
  setMaxFileSize: (size: number) => void;
}

const SelectedFilesContext = createContext<SelectedFilesContextValue | undefined>(undefined);

interface SelectedFilesProviderProps {
  children: ReactNode;
  files?: RepoFile[];
}

export function SelectedFilesProvider({ children, files = [] }: SelectedFilesProviderProps) {
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [maxFileSize, setMaxFileSize] = useState<number>(51200); // 50kb default

  // Auto-select files that are within size limit when files load or size changes
  useEffect(() => {
    if (files && files.length > 0) {
      const filteredFiles = files.filter(f => (f.size || 0) <= maxFileSize);
      setSelectedFilePaths(new Set(filteredFiles.map(f => f.path)));
    }
  }, [files, maxFileSize]);

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

  const value: SelectedFilesContextValue = useMemo(() => ({
    selectedFilePaths,
    toggleFile,
    selectAll,
    deselectAll,
    isFileSelected,
    selectedCount: selectedFilePaths.size,
    maxFileSize,
    setMaxFileSize,
  }), [selectedFilePaths, toggleFile, selectAll, deselectAll, isFileSelected, maxFileSize, setMaxFileSize]);

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
