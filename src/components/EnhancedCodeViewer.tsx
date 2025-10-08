'use client';

import { useState } from 'react';
import { Copy, Check, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RepoFile } from '@/types/repo';
import ShikiHighlighter from 'react-shiki/web';

interface EnhancedCodeViewerProps {
  files: RepoFile[];
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getLanguageFromExtension = (extension?: string): string => {
  const ext = extension?.toLowerCase();
  const languageMap: Record<string, string> = {
    'tsx': 'tsx',
    'ts': 'typescript',
    'jsx': 'jsx',
    'js': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'py': 'python',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'sh': 'bash',
    'yml': 'yaml',
    'yaml': 'yaml',
    'sql': 'sql',
    'txt': 'text',
  };
  return languageMap[ext || ''] || 'text';
};

const generateBreadcrumb = (filePath: string) => {
  const parts = filePath.split('/');
  return parts.map((part, index) => ({
    name: part,
    path: parts.slice(0, index + 1).join('/'),
    isLast: index === parts.length - 1
  }));
};

export function EnhancedCodeViewer({ files }: EnhancedCodeViewerProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const handleCopyFile = async (filePath: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(filePath);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadFile = (fileName: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!files || files.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No files selected</h3>
            <p className="text-gray-500">Choose files from the sidebar to view their contents</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Scrollable Files */}
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        {files.map((file, fileIndex) => {
          const fileName = file.path.split('/').pop() || file.path;
          const content = file.content || '';
          const breadcrumbs = generateBreadcrumb(file.path);
          const extension = fileName.split('.').pop() || 'txt';
          const language = getLanguageFromExtension(extension);
          const lines = content.split('\n');

          return (
            <div key={file.path} id={`file-${file.path}`} className={fileIndex > 0 ? 'border-t-4 border-gray-300' : ''}>
              {/* File Header with Breadcrumb */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 sticky top-0 z-10">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-3 overflow-x-auto">
                  {breadcrumbs.map((crumb) => (
                    <div key={crumb.path} className="flex items-center">
                      <span className={`whitespace-nowrap ${crumb.isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {crumb.name}
                      </span>
                      {!crumb.isLast && <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />}
                    </div>
                  ))}
                </nav>

                {/* File Info */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{lines.length} lines</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyFile(file.path, content)}
                    >
                      {copiedFile === file.path ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                      {copiedFile === file.path ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadFile(fileName, content)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>

              {/* Code Content */}
              <div className="relative shiki-wrapper">
                <ShikiHighlighter
                  language={language}
                  theme="github-dark"
                  showLineNumbers={true}
                >
                  {content}
                </ShikiHighlighter>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
