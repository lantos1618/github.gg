'use client';

import React, { useState, useMemo } from 'react';
import {
  File,
  Search,
  Copy,
  Check,
  CheckCircle2,
  Circle,
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RepoFile } from '@/types/repo';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { useSelectedFiles } from '@/contexts/SelectedFilesContext';
import {
  getFileIcon,
  formatFileSize,
  buildFileTree,
  generateFileTreeText,
  FileTreeItem,
  type TreeNode,
} from '@/components/file-browser/shared-utils';

interface FileTreeSidebarProps {
  files: RepoFile[];
  selectedFiles: Set<string>;
  onToggleFile: (filePath: string) => void;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function FileTreeSidebar({
  files,
  selectedFiles,
  onToggleFile,
  className,
  isOpen = true,
  onToggle
}: FileTreeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copiedTree, setCopiedTree] = useState(false);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const { maxFileSize, setMaxFileSize } = useSelectedFiles();

  // Get selected files for copy all
  const selectedFileObjects = useMemo(() =>
    files.filter(f => selectedFiles.has(f.path)),
    [files, selectedFiles]
  );

  const { copyAllContent, isCopying, copied: copiedAll } = useCopyRepoFiles(selectedFileObjects);

  // Count files filtered by size
  const filesFilteredBySize = useMemo(() => {
    return files.filter(f => (f.size || 0) > maxFileSize).length;
  }, [files, maxFileSize]);

  // Get hidden files
  const hiddenFiles = useMemo(() => {
    return files.filter(f => (f.size || 0) > maxFileSize);
  }, [files, maxFileSize]);

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter(file =>
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const toggleAllInFolder = (node: TreeNode) => {
    const filePaths: string[] = [];

    const collectFiles = (n: TreeNode) => {
      if (n.type === 'file' && n.file) {
        filePaths.push(n.file.path);
      } else if (n.children) {
        n.children.forEach(collectFiles);
      }
    };

    collectFiles(node);

    const allSelected = filePaths.every(path => selectedFiles.has(path));
    filePaths.forEach(path => {
      if (allSelected && selectedFiles.has(path)) {
        onToggleFile(path);
      } else if (!allSelected && !selectedFiles.has(path)) {
        onToggleFile(path);
      }
    });
  };

  const handleCopyFileTree = async () => {
    const treeText = generateFileTreeText(fileTree);
    try {
      await navigator.clipboard.writeText(treeText);
      setCopiedTree(true);
      setTimeout(() => setCopiedTree(false), 2000);
    } catch (err) {
      console.error('Failed to copy file tree:', err);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside className={`
        bg-white border-r border-gray-200 flex flex-col h-full max-h-full
        fixed lg:static inset-y-0 left-0 z-50 w-80
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${className || ''}
      `} style={{ contain: 'layout style paint', willChange: isOpen ? 'transform' : 'auto' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={copyAllContent}
              disabled={isCopying || selectedFiles.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy all file contents for AI/LLM"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy for AI</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopyFileTree}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              title="Copy file tree structure"
            >
              {copiedTree ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tree</span>
                </>
              )}
            </button>
            {onToggle && (
              <button
                onClick={onToggle}
                className="lg:hidden p-1.5 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                title="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* File Size Filter */}
        <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-700">Max File Size</label>
            <span className="text-xs font-mono text-gray-600">{formatFileSize(maxFileSize)}</span>
          </div>
          <Slider
            value={[maxFileSize]}
            onValueChange={([value]) => setMaxFileSize(value)}
            min={10240}
            max={1048576}
            step={10240}
            className="w-full"
          />
          {filesFilteredBySize > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer hover:bg-orange-50 px-2 py-1 rounded transition-colors w-full text-left"
              >
                {showHiddenFiles ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                {filesFilteredBySize} file{filesFilteredBySize > 1 ? 's' : ''} hidden (too large)
              </button>

              {showHiddenFiles && (
                <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded-md max-h-32 overflow-y-auto">
                  <ul className="space-y-1">
                    {hiddenFiles.map((file) => {
                      const fileName = file.path.split('/').pop() || file.path;
                      return (
                        <li key={file.path} className="text-xs text-gray-600">
                          <div className="flex items-center justify-between px-1 py-0.5 truncate">
                            <span className="truncate text-xs">{file.path}</span>
                            <span className="text-xs text-gray-500 font-mono flex-shrink-0 ml-1">
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">{files.length - filesFilteredBySize} files</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
              {selectedFiles.size} selected
            </Badge>
            {searchTerm && (
              <Badge variant="secondary" className="text-xs">
                {filteredFiles.length} shown
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 bg-gradient-to-b from-white to-gray-50/30 min-h-0" style={{ willChange: 'scroll-position' }}>
        {searchTerm ? (
          filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <File className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">No files found</p>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const fileName = file.path.split('/').pop() || file.path;
              const Icon = getFileIcon(fileName);
              const isSelected = selectedFiles.has(file.path);

              return (
                <div
                  key={file.path}
                  className={`
                    flex items-center py-2.5 px-3 cursor-pointer rounded-lg mx-2 group
                    ${isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200' : 'hover:bg-gray-50'}
                  `}
                  onClick={() => onToggleFile(file.path)}
                >
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 mr-3 flex-shrink-0 text-blue-600" />
                  ) : (
                    <Circle className="w-4 h-4 mr-3 flex-shrink-0 text-gray-300" />
                  )}
                  <Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="flex-1 text-sm font-medium truncate">{file.path}</span>
                  {file.size && (
                    <span className="text-xs text-gray-400 font-mono ml-2">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              );
            })
          )
        ) : (
          fileTree.map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              level={0}
              selectedFiles={selectedFiles}
              expandedFolders={expandedFolders}
              onToggleFile={onToggleFile}
              onToggleFolder={toggleFolder}
              onToggleAllInFolder={toggleAllInFolder}
            />
          ))
        )}
      </div>
    </aside>
    </>
  );
}
