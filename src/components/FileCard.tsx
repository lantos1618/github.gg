import { RepoFile } from '@/types/repo';

interface FileCardProps {
  file: RepoFile;
  showContent?: boolean;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function FileCard({ file, showContent = true }: FileCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <div className="font-mono text-sm text-gray-700">{file.path}</div>
        <div className="text-xs text-gray-500">
          {formatBytes(file.size)}
        </div>
      </div>
      {showContent && file.content && (
        <pre className="p-6 bg-gray-900 text-gray-100 overflow-x-auto">
          <code className="text-sm font-mono leading-relaxed">
            {file.content}
          </code>
        </pre>
      )}
    </div>
  );
} 