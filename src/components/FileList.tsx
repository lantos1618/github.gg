import { FileCard } from './FileCard';
import { RepoFile } from '@/types/repo';

interface FileListProps {
  files: RepoFile[];
  showContent?: boolean;
  emptyMessage?: string;
}

export function FileList({ 
  files, 
  showContent = true, 
  emptyMessage = "No files found" 
}: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-gray-500 bg-white p-8 rounded-lg text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {files.map((file, index) => (
          <FileCard 
            key={index} 
            file={file} 
            showContent={showContent} 
          />
        ))}
      </div>
    </div>
  );
} 