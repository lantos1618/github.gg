import { useState } from 'react';
import { RepoFile } from '@/types/repo';
import { toast } from 'sonner';

const MAX_COPY_SIZE = 10 * 1024 * 1024; // 10MB

export function useCopyRepoFiles(files: RepoFile[]) {
  const [isCopying, setIsCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAllContent = async () => {
    setIsCopying(true);
    setCopied(false);
    try {
      const totalSize = files.reduce((size, file) => size + file.content.length + file.path.length + 10, 0);
      if (totalSize > MAX_COPY_SIZE) {
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(1);
        throw new Error(`Content too large (${sizeInMB}MB). Maximum size is ${MAX_COPY_SIZE / (1024 * 1024)}MB.`);
      }
      const allContent = files
        .map((file: RepoFile) => `// ${file.path}\n${file.content}`)
        .join('\n\n');
      await navigator.clipboard.writeText(allContent);
      setCopied(true);
      toast.success('All content copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to copy content');
    } finally {
      setIsCopying(false);
    }
  };

  return { copyAllContent, isCopying, copied };
} 