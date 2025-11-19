'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { VersionDropdown } from '@/components/VersionDropdown';

interface AnalysisHeaderProps {
  versions: any[];
  isLoadingVersions: boolean;
  selectedVersion: number | null;
  onVersionChange: (version: number | null) => void;
  onRegenerate: () => void;
  onCopyMarkdown: (markdown: string) => void;
  markdown: string | null | undefined;
  isRegenerating: boolean;
  canAccess: boolean | null | undefined;
  showCopyButton?: boolean;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
  versions,
  isLoadingVersions,
  selectedVersion,
  onVersionChange,
  onRegenerate,
  onCopyMarkdown,
  markdown,
  isRegenerating,
  canAccess,
  showCopyButton = true,
}) => {
  const handleCopy = useCallback(() => {
    if (markdown) {
      onCopyMarkdown(markdown);
    }
  }, [markdown, onCopyMarkdown]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
      <VersionDropdown
        versions={versions}
        isLoading={isLoadingVersions}
        selectedVersion={selectedVersion}
        onVersionChange={onVersionChange}
      />

      <div className="flex items-center gap-2">
        {showCopyButton && markdown && (
          <Button
            onClick={handleCopy}
            variant="outline"
            className="flex items-center gap-2"
            title="Copy Markdown"
          >
            <Copy className="h-4 w-4" />
            Copy Markdown
          </Button>
        )}
        {canAccess && (
          <Button
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Generating...' : 'Regenerate'}
          </Button>
        )}
      </div>
    </div>
  );
};
