'use client';

import React, { useState, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  X,
  GitBranch,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RepoFile } from '@/types/repo';
import { useCopyRepoFiles } from '@/lib/hooks/useCopyRepoFiles';
import { useSelectedFiles } from '@/contexts/SelectedFilesContext';
import { cn, parseRepoPath } from '@/lib/utils';
import { trpc } from '@/lib/trpc/client';

interface FileExplorerDrawerProps {
  owner: string;
  repo: string;
  files: RepoFile[];
  selectedFiles: Set<string>;
  onToggleFile: (filePath: string) => void;
  isOpen: boolean;
  onClose: () => void;
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

export function FileExplorerDrawer({
  owner,
  repo,
  files,
  selectedFiles,
  onToggleFile,
  isOpen,
  onClose
}: FileExplorerDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [copiedTree, setCopiedTree] = useState(false);
  const { maxFileSize, setMaxFileSize } = useSelectedFiles();
  const pathname = usePathname();
  const router = useRouter();

  // Fetch branches and repo info
  const { data: branches } = trpc.github.getBranches.useQuery({ owner, repo });
  const { data: repoInfo } = trpc.github.getRepoInfo.useQuery({ owner, repo });

  // Get the actual default branch from repo info, fallback to 'main'
  const defaultBranch = repoInfo?.defaultBranch || 'main';

  // Check if we're on a wiki page
  const isOnWikiPage = pathname.startsWith(`/wiki/${owner}/${repo}`);

  // Parse the URL to get current branch
  let currentBranch: string;
  let currentTab: string | undefined;
  let baseUrl: string;

  if (isOnWikiPage) {
    currentBranch = defaultBranch;
    currentTab = undefined;
    baseUrl = `/${owner}/${repo}`;
  } else {
    const pathParts = pathname.split('/').filter(Boolean);
    const params = { user: owner, params: pathParts.slice(1) };
    const parsed = parseRepoPath(params, branches || []);

    currentBranch = parsed.ref || defaultBranch;
    currentTab = parsed.tab;

    baseUrl = currentBranch === defaultBranch
      ? `/${owner}/${repo}`
      : `/${owner}/${repo}/tree/${currentBranch}`;
  }

  const handleBranchChange = (newBranch: string) => {
    if (isOnWikiPage) {
      const wikiSlugMatch = pathname.match(/^\/wiki\/[^/]+\/[^/]+\/(.+)$/);
      const slug = wikiSlugMatch ? wikiSlugMatch[1] : '';

      if (slug) {
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}/${slug}`
          : `/${owner}/${repo}/tree/${newBranch}/${slug}`;
        router.push(targetUrl);
      } else {
        const targetUrl = newBranch === defaultBranch
          ? `/${owner}/${repo}`
          : `/${owner}/${repo}/tree/${newBranch}`;
        router.push(targetUrl);
      }
      return;
    }

    let targetUrl: string;

    if (newBranch === defaultBranch) {
      targetUrl = currentTab ? `/${owner}/${repo}/${currentTab}` : `/${owner}/${repo}`;
    } else {
      targetUrl = currentTab
        ? `/${owner}/${repo}/tree/${newBranch}/${currentTab}`
        : `/${owner}/${repo}/tree/${newBranch}`;
    }

    router.push(targetUrl);
  };

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
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={cn(
          'fixed right-0 top-14 bg-white border-l border-gray-200 shadow-xl z-50',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'w-96',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ height: 'calc(100vh - 3.5rem)' }}
      >
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
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                title="Close file explorer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Branch Selector */}
          {branches && branches.length > 0 && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                Branch
              </label>
              <select
                value={currentBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md bg-white text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                {branches.map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <p className="text-xs text-orange-600 mt-2">
                {filesFilteredBySize} file{filesFilteredBySize > 1 ? 's' : ''} hidden (too large)
              </p>
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
        <div className="flex-1 overflow-y-auto py-2 bg-gradient-to-b from-white to-gray-50/30 min-h-0">
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
