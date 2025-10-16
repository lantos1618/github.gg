'use client';

import React, { useState, useMemo } from 'react';
import {
  File,
  Folder,
  Search,
  Code,
  FileText,
  Image,
  Settings,
  Database,
  Package,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Copy,
  Check,
  ArrowRight,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RepoFile } from '@/types/repo';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';

interface FileTreeSidebarProps {
  files: RepoFile[];
  selectedFiles: Set<string>;
  onToggleFile: (filePath: string) => void;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const getFileIcon = (filename?: string) => {
  if (!filename) return File;
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'tsx':
    case 'ts':
    case 'js':
    case 'jsx':
      return Code;
    case 'md':
    case 'txt':
      return FileText;
    case 'json':
    case 'yml':
    case 'yaml':
      return Settings;
    case 'png':
    case 'jpg':
    case 'svg':
    case 'gif':
      return Image;
    case 'sql':
      return Database;
    case 'dockerfile':
      return Package;
    default:
      return File;
  }
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: RepoFile;
}

function buildFileTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode[] = [];

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');

      let existingNode = currentLevel.find(node => node.name === part);

      if (!existingNode) {
        const newNode: TreeNode = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
          file: isFile ? file : undefined
        };
        currentLevel.push(newNode);
        existingNode = newNode;
      }

      if (!isFile && existingNode.children) {
        currentLevel = existingNode.children;
      }
    });
  });

  return root;
}

interface FileTreeItemProps {
  node: TreeNode;
  level: number;
  selectedFiles: Set<string>;
  expandedFolders: Set<string>;
  onToggleFile: (filePath: string) => void;
  onToggleFolder: (folderPath: string) => void;
  onToggleAllInFolder: (node: TreeNode) => void;
}

const FileTreeItem = React.memo(function FileTreeItem({
  node,
  level,
  selectedFiles,
  expandedFolders,
  onToggleFile,
  onToggleFolder,
  onToggleAllInFolder
}: FileTreeItemProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isFile = node.type === 'file';

  if (isFile && node.file) {
    const isSelected = selectedFiles.has(node.file.path);
    const Icon = getFileIcon(node.name);

    const handleGoto = (e: React.MouseEvent) => {
      e.stopPropagation();
      const element = document.getElementById(`file-${node.file!.path}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    return (
      <div
        key={node.path}
        onClick={() => onToggleFile(node.file!.path)}
        className={`
          flex items-center py-2 px-3 rounded-lg mx-2 group cursor-pointer
          ${isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200' : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <div
          className="flex items-center flex-1"
        >
          {isSelected ? (
            <CheckCircle2 className="w-4 h-4 mr-3 flex-shrink-0 text-blue-600" />
          ) : (
            <Circle className="w-4 h-4 mr-3 flex-shrink-0 text-gray-300" />
          )}
          <Icon className={`w-4 h-4 mr-2 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
          <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
          {node.file.size && (
            <span className="text-xs text-gray-400 font-mono ml-2">
              {formatFileSize(node.file.size)}
            </span>
          )}
        </div>
        {isSelected && (
          <button
            onClick={handleGoto}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-200 rounded transition-all ml-1 cursor-pointer"
            title="Go to file"
          >
            <ArrowRight className="w-3.5 h-3.5 text-blue-600 cursor-pointer" />
          </button>
        )}
      </div>
    );
  }

  const folderHasSelectedFiles = (n: TreeNode): boolean => {
    if (n.type === 'file' && n.file) {
      return selectedFiles.has(n.file.path);
    }
    return n.children?.some(folderHasSelectedFiles) || false;
  };

  const hasSelected = folderHasSelectedFiles(node);
  const FolderIcon = isExpanded ? FolderOpen : Folder;

  return (
    <div key={node.path}>
      <div
        className={`
          flex items-center py-2 px-3 rounded-lg mx-2 group cursor-pointer
          ${hasSelected ? 'bg-blue-50/50 border border-blue-200' : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFolder(node.path);
          }}
          className="p-0.5 -ml-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0 cursor-pointer"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
        <div
          onClick={() => onToggleAllInFolder(node)}
          className="flex items-center flex-1 ml-1 cursor-pointer"
        >
          <FolderIcon className={`w-4 h-4 mr-2 flex-shrink-0 ${hasSelected ? 'text-blue-500' : 'text-gray-500'}`} />
          <span className={`flex-1 text-sm font-medium truncate ${hasSelected ? 'text-blue-900' : ''}`}>
            {node.name}
          </span>
        </div>
      </div>

      {isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              selectedFiles={selectedFiles}
              expandedFolders={expandedFolders}
              onToggleFile={onToggleFile}
              onToggleFolder={onToggleFolder}
              onToggleAllInFolder={onToggleAllInFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
});

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

  // Get selected files for copy all
  const selectedFileObjects = useMemo(() =>
    files.filter(f => selectedFiles.has(f.path)),
    [files, selectedFiles]
  );

  const { copyAllContent, isCopying, copied: copiedAll } = useCopyRepoFiles(selectedFileObjects);

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

  const generateFileTreeText = (nodes: TreeNode[], prefix = ''): string => {
    let result = '';
    nodes.forEach((node, index) => {
      const isLast = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = node.type === 'folder' ? '📁 ' : '📄 ';
      result += prefix + connector + icon + node.name + '\n';
      if (node.type === 'folder' && node.children && node.children.length > 0) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        result += generateFileTreeText(node.children, newPrefix);
      }
    });
    return result;
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
        bg-white border-r border-gray-200 flex flex-col h-full
        fixed lg:static inset-y-0 left-0 z-50 w-80
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${className || ''}
      `} style={{ contain: 'layout style paint', willChange: isOpen ? 'transform' : 'auto' }}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-blue-500" />
            Files
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAllContent}
              disabled={isCopying || selectedFiles.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Copy all selected files"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy All</span>
                </>
              )}
            </button>
            <button
              onClick={handleCopyFileTree}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              title="Copy file tree"
            >
              {copiedTree ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="hidden sm:inline">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy Tree</span>
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

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="font-medium">{files.length} files</span>
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
      <div className="flex-1 overflow-y-auto py-2 bg-gradient-to-b from-white to-gray-50/30" style={{ willChange: 'scroll-position' }}>
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
