'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Download, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RepoFile } from '@/types/repo';

interface EnhancedCodeViewerProps {
  file: RepoFile | null;
}

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getSyntaxHighlighting = (line: string, extension?: string) => {
  const ext = extension?.toLowerCase();

  if (ext === 'tsx' || ext === 'ts' || ext === 'jsx' || ext === 'js') {
    if (line.includes('import') || line.includes('export')) return 'text-purple-400';
    if (line.includes('interface') || line.includes('type') || line.includes('class')) return 'text-blue-400';
    if (line.includes('const') || line.includes('let') || line.includes('var')) return 'text-green-400';
    if (line.includes('function') || line.includes('=>')) return 'text-yellow-400';
    if (line.trim().startsWith('//')) return 'text-gray-500';
  } else if (ext === 'json') {
    if (line.includes(':')) return 'text-green-400';
    if (line.includes('"')) return 'text-orange-400';
  } else if (ext === 'md') {
    if (line.startsWith('#')) return 'text-blue-400 font-bold';
    if (line.startsWith('-') || line.startsWith('*')) return 'text-green-400';
  }

  return 'text-gray-100';
};

const generateBreadcrumb = (filePath: string) => {
  const parts = filePath.split('/');
  return parts.map((part, index) => ({
    name: part,
    path: parts.slice(0, index + 1).join('/'),
    isLast: index === parts.length - 1
  }));
};

export function EnhancedCodeViewer({ file }: EnhancedCodeViewerProps) {
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyCode = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCopyLine = async (lineNumber: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLine(lineNumber);
      setTimeout(() => setCopiedLine(null), 2000);
    } catch (err) {
      console.error('Failed to copy line:', err);
    }
  };

  if (!file) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No file selected</h3>
            <p className="text-gray-500">Choose a file from the sidebar to view its contents</p>
          </div>
        </div>
      </div>
    );
  }

  const content = file.content || '';
  const lines = content.split('\n');
  const breadcrumbs = generateBreadcrumb(file.path);
  const extension = file.name.split('.').pop();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* File Header with Breadcrumb */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50">
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
            <h3 className="text-lg font-semibold text-gray-900">{file.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
              <span>{formatFileSize(file.size)}</span>
              <span>{lines.length} lines</span>
              <span>.{extension}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyCode(content)}
            >
              {copiedAll ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copiedAll ? 'Copied!' : 'Copy'}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </div>

      {/* Code Content */}
      <div className="relative">
        <div className="bg-gray-900 text-gray-100 overflow-x-auto">
          <div className="flex">
            {/* Line Numbers */}
            <div className="bg-gray-800 px-4 py-6 text-right text-sm text-gray-400 select-none min-w-[60px] border-r border-gray-700">
              {lines.map((_, lineIndex) => (
                <div key={lineIndex} className="leading-6 h-6">
                  {lineIndex + 1}
                </div>
              ))}
            </div>

            {/* Code Lines */}
            <div className="flex-1 px-6 py-6">
              {lines.map((line, index) => (
                <div
                  key={index}
                  className="group flex items-center justify-between leading-6 h-6 hover:bg-gray-800 rounded transition-colors duration-200"
                >
                  <pre className="flex-1 text-sm font-mono overflow-x-auto">
                    <code className={getSyntaxHighlighting(line, extension)}>
                      {line || ' '}
                    </code>
                  </pre>

                  {/* Copy Line Button */}
                  {line.trim() && (
                    <button
                      onClick={() => handleCopyLine(index, line)}
                      className="opacity-0 group-hover:opacity-100 ml-4 p-1 hover:bg-gray-700 rounded transition-all duration-200"
                      title="Copy line"
                    >
                      {copiedLine === index ? (
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="w-3 h-3 text-green-400" />
                        </motion.div>
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400 hover:text-gray-200" />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
