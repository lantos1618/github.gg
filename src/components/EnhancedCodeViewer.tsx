'use client';

import { useState, memo, useRef, useEffect } from 'react';
import { Copy, Check, Download, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RepoFile } from '@/types/repo';
import ShikiHighlighter from 'react-shiki/web';

const MAX_LINES_INITIAL = 300; // Show first 300 lines by default
const LARGE_FILE_THRESHOLD = 500; // Files over 500 lines are considered large

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

const FileItem = memo(function FileItem({ file, fileIndex, copiedFile, onCopy, onDownload }: {
  file: RepoFile;
  fileIndex: number;
  copiedFile: string | null;
  onCopy: (path: string, content: string) => void;
  onDownload: (name: string, content: string) => void;
}) {
  const [isInView, setIsInView] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fileName = file.path.split('/').pop() || file.path;
  const content = file.content || '';
  const breadcrumbs = generateBreadcrumb(file.path);
  const extension = fileName.split('.').pop() || 'txt';
  const language = getLanguageFromExtension(extension);
  const lines = content.split('\n');

  const isLargeFile = lines.length > LARGE_FILE_THRESHOLD;
  const displayContent = isLargeFile && !isExpanded
    ? lines.slice(0, MAX_LINES_INITIAL).join('\n')
    : content;
  const hiddenLinesCount = isLargeFile ? lines.length - MAX_LINES_INITIAL : 0;

  // Lazy load with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01
      }
    );

    const currentContainer = containerRef.current;
    if (currentContainer) {
      observer.observe(currentContainer);
    }

    return () => {
      if (currentContainer) {
        observer.unobserve(currentContainer);
      }
    };
  }, [isInView]);

  // Track when Shiki finishes highlighting
  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setIsHighlighting(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isInView, displayContent]);

  return (
    <div
      ref={containerRef}
      key={file.path}
      id={`file-${file.path}`}
      className={fileIndex > 0 ? 'border-t-4 border-gray-300' : ''}
      style={{ contentVisibility: 'auto', minHeight: isInView ? 'auto' : '400px' }}
    >
      {/* File Header with Breadcrumb */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 sticky top-0 z-10">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 overflow-x-auto scrollbar-hide">
          {breadcrumbs.map((crumb) => (
            <div key={crumb.path} className="flex items-center flex-shrink-0">
              <span className={`whitespace-nowrap ${crumb.isLast ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                {crumb.name}
              </span>
              {!crumb.isLast && <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 mx-0.5 sm:mx-1" />}
            </div>
          ))}
        </nav>

        {/* File Info & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-500">
            <span>{formatFileSize(file.size)}</span>
            <span>{lines.length} lines</span>
            {isLargeFile && !isExpanded && (
              <span className="text-amber-600 font-medium">
                (showing first {MAX_LINES_INITIAL})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCopy(file.path, content)}
              className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              {copiedFile === file.path ? <Check className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" /> : <Copy className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />}
              <span className="hidden sm:inline">{copiedFile === file.path ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(fileName, content)}
              className="flex-1 sm:flex-initial text-xs sm:text-sm h-8 px-2 sm:px-3"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Code Content */}
      {isInView ? (
        <>
          <div className="relative shiki-wrapper" style={{ contain: 'layout style paint' }}>
            {isHighlighting && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                <div className="text-gray-400 text-sm">Loading syntax highlighting...</div>
              </div>
            )}
            <ShikiHighlighter
              language={language}
              theme="github-dark"
              showLineNumbers={true}
            >
              {displayContent}
            </ShikiHighlighter>
          </div>

          {/* Expand button for large files */}
          {isLargeFile && !isExpanded && (
            <div className="border-t border-gray-700 bg-gray-800 p-4 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
              >
                <ChevronDown className="w-4 h-4 mr-2" />
                Show {hiddenLinesCount} more lines
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-900 p-8 flex items-center justify-center min-h-[200px]">
          <div className="text-gray-500 text-sm">Scroll to load content...</div>
        </div>
      )}
    </div>
  );
});

export function EnhancedCodeViewer({ files }: EnhancedCodeViewerProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

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

  const handleCopyAllForAI = async () => {
    try {
      const allContent = files.map(file =>
        `// File: ${file.path}\n${file.content || ''}`
      ).join('\n\n');

      await navigator.clipboard.writeText(allContent);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy all files:', err);
    }
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden relative">
      {/* Sticky Header with Copy for AI */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {files.length} {files.length === 1 ? 'file' : 'files'} selected
          </span>
        </div>
        <button
          onClick={handleCopyAllForAI}
          disabled={files.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-300 rounded-md hover:bg-purple-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy all file contents for AI/LLM"
        >
          {copiedAll ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy for AI</span>
            </>
          )}
        </button>
      </div>

      {/* Files */}
      <div>
        {files.map((file, fileIndex) => (
          <FileItem
            key={file.path}
            file={file}
            fileIndex={fileIndex}
            copiedFile={copiedFile}
            onCopy={handleCopyFile}
            onDownload={handleDownloadFile}
          />
        ))}
      </div>
    </div>
  );
}
