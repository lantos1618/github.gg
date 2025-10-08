'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  File,
  Folder,
  Search,
  Code,
  FileText,
  Image,
  Settings,
  Database,
  Package
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RepoFile } from '@/types/repo';

interface FileTreeSidebarProps {
  files: RepoFile[];
  onFileSelect?: (file: RepoFile) => void;
  selectedFile?: string;
  className?: string;
}

const getFileIcon = (filename: string) => {
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

export function FileTreeSidebar({
  files,
  onFileSelect,
  selectedFile,
  className
}: FileTreeSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter(file =>
      file.path.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  return (
    <aside className={`bg-white border-r border-gray-200 flex flex-col h-full ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Folder className="w-5 h-5 mr-2 text-blue-500" />
            Files
          </h2>
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
          <Badge variant="secondary" className="text-xs">
            {filteredFiles.length} shown
          </Badge>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto py-2 bg-gradient-to-b from-white to-gray-50/30">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <File className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No files found</p>
          </div>
        ) : (
          filteredFiles.map((file) => {
            const Icon = getFileIcon(file.name);
            const isSelected = selectedFile === file.path;

            return (
              <motion.div
                key={file.path}
                className={`
                  flex items-center py-2.5 px-3 cursor-pointer rounded-lg mx-2 transition-all duration-200 group
                  ${isSelected ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-900 border border-blue-200' : 'hover:bg-gray-50'}
                `}
                onClick={() => onFileSelect?.(file)}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                {file.size && (
                  <span className="text-xs text-gray-400 font-mono ml-2">
                    {formatFileSize(file.size)}
                  </span>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </aside>
  );
}
