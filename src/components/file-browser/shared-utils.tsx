import React from 'react';
import {
  File,
  Folder,
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
  ArrowRight,
} from 'lucide-react';
import { RepoFile } from '@/types/repo';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  file?: RepoFile;
}

const EXT_ICONS: Record<string, typeof File> = {
  tsx: Code, ts: Code, js: Code, jsx: Code,
  md: FileText, txt: FileText,
  json: Settings, yml: Settings, yaml: Settings,
  png: Image, jpg: Image, svg: Image, gif: Image,
  sql: Database,
  dockerfile: Package,
};

export function getFileIcon(filename?: string) {
  if (!filename) return File;
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? (EXT_ICONS[ext] || File) : File;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function buildFileTree(files: RepoFile[]): TreeNode[] {
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

export function generateFileTreeText(nodes: TreeNode[], prefix = ''): string {
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
}

export interface FileTreeItemProps {
  node: TreeNode;
  level: number;
  selectedFiles: Set<string>;
  expandedFolders: Set<string>;
  onToggleFile: (filePath: string) => void;
  onToggleFolder: (folderPath: string) => void;
  onToggleAllInFolder: (node: TreeNode) => void;
}

export const FileTreeItem = React.memo(function FileTreeItem({
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
