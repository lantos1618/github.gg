interface RepoStatusProps {
  error?: { message: string } | null;
}

export function RepoStatus({ 
  error
}: RepoStatusProps) {
  if (error) {
    const isNotFound = error.message.includes('not found') || error.message.includes('404');
    const isUnauthorized = error.message.includes('unauthorized') || error.message.includes('401');
    
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-lg font-semibold mb-2">
            {isNotFound ? 'Repository Not Found' : 
             isUnauthorized ? 'Access Denied' : 
             'Error Loading Repository'}
          </div>
          <div className="text-gray-600 text-sm">
            {isNotFound ? 
              'The repository you\'re looking for doesn\'t exist or is private.' :
              isUnauthorized ?
              'You don\'t have permission to access this repository.' :
              error.message
            }
          </div>
          {isNotFound && (
            <div className="mt-4 text-xs text-gray-500">
              Try a public repository like: lantos1618/github.gg
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
} 