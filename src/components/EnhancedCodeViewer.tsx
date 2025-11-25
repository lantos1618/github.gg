'use client';

import { useState, memo, useRef, useEffect } from 'react';
import { Copy, Check, Download, ChevronRight, ChevronDown, Sparkles, FileText, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RepoFile } from '@/types/repo';
import ShikiHighlighter from 'react-shiki/web';
import { cn } from '@/lib/utils';

const MAX_LINES_INITIAL = 300;
const LARGE_FILE_THRESHOLD = 500;

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
  const extension = fileName.split('.').pop() || 'txt';
  const language = getLanguageFromExtension(extension);
  const lines = content.split('\n');

  const isLargeFile = lines.length > LARGE_FILE_THRESHOLD;
  const displayContent = isLargeFile && !isExpanded
    ? lines.slice(0, MAX_LINES_INITIAL).join('\n')
    : content;
  const hiddenLinesCount = isLargeFile ? lines.length - MAX_LINES_INITIAL : 0;

  // Lazy load
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
          }
        });
      },
      { rootMargin: '200px', threshold: 0.01 }
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

  // Track Shiki highlighting
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
      id={`file-${file.path}`}
      className={cn(
        "group relative flex flex-col bg-card border border-border rounded-xl overflow-hidden transition-all duration-200",
        fileIndex > 0 && "mt-6"
      )}
      style={{ contentVisibility: 'auto', minHeight: isInView ? 'auto' : '200px' }}
    >
      {/* File Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-3 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 bg-background rounded-md border border-border shadow-sm shrink-0">
            {language === 'typescript' || language === 'tsx' || language === 'javascript' ? (
              <Terminal className="w-4 h-4 text-blue-500" />
            ) : (
              <FileText className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground overflow-hidden">
              {file.path.split('/').slice(0, -1).map((part, i) => (
                <span key={i} className="flex items-center whitespace-nowrap">
                  {part}
                  <ChevronRight className="w-3 h-3 mx-1 opacity-50" />
                </span>
              ))}
            </div>
            <span className="font-medium text-sm text-foreground truncate">
              {fileName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 mr-2 text-xs text-muted-foreground font-mono">
            <span>{formatFileSize(file.size)}</span>
            <span>{lines.length} lines</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCopy(file.path, content)}
            className="h-8 w-8 hover:bg-background hover:border border-transparent hover:border-border transition-all"
            title="Copy file content"
          >
            {copiedFile === file.path ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDownload(fileName, content)}
            className="h-8 w-8 hover:bg-background hover:border border-transparent hover:border-border transition-all"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Code Content */}
      <div className="relative bg-[#0d1117] min-h-[100px]">
        {isInView ? (
          <>
            <div className="relative shiki-wrapper text-sm">
              {isHighlighting && (
                <div className="absolute inset-0 bg-[#0d1117] flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
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

            {isLargeFile && !isExpanded && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/90 to-transparent pt-20 pb-8 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="shadow-lg border border-border/10 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white"
                >
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show remaining {hiddenLinesCount} lines
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
            Loading content...
          </div>
        )}
      </div>
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
      <div className="flex flex-col items-center justify-center py-24 text-center px-4 border border-dashed border-border rounded-xl bg-muted/20">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">No files selected</h3>
        <p className="text-muted-foreground max-w-sm">
          Select files from the repository explorer to view their contents and analyze them.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 -mx-4 sm:-mx-6 bg-background/80 backdrop-blur-md border-b border-border shadow-sm supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Selected Files</h2>
            <p className="text-xs text-muted-foreground">
              {files.length} {files.length === 1 ? 'file' : 'files'} ready for review
            </p>
          </div>
        </div>

        <Button
          onClick={handleCopyAllForAI}
          disabled={files.length === 0}
          className={cn(
            "relative overflow-hidden transition-all duration-300",
            copiedAll 
              ? "bg-green-600 hover:bg-green-700 text-white ring-offset-2 ring-2 ring-green-600 ring-offset-background" 
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-md"
          )}
        >
          {copiedAll ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied to Clipboard
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-pulse" />
              Copy for AI
            </>
          )}
        </Button>
      </div>

      {/* Files List */}
      <div className="space-y-8 pb-10">
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
