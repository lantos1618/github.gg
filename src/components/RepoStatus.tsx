interface RepoStatusProps {
  error?: { message: string } | null;
}

export function RepoStatus({
  error
}: RepoStatusProps) {
  if (error) {
    const isNotFound = error.message.includes('not found') || error.message.includes('404');
    const isUnauthorized = error.message.includes('unauthorized') || error.message.includes('401');

    const title = isNotFound ? 'Repository Not Found'
      : isUnauthorized ? 'Access Denied'
      : 'Error Loading Repository';

    const desc = isNotFound
      ? 'The repository you\'re looking for doesn\'t exist or is private.'
      : isUnauthorized
      ? 'You don\'t have permission to access this repository.'
      : error.message;

    const color = isNotFound ? '#6b7280' : isUnauthorized ? '#f59e0b' : '#ea4335';

    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-[90%] max-w-[500px]">
          <div className="bg-[#f8f9fa] py-[14px] px-[16px]" style={{ borderLeft: `3px solid ${color}` }}>
            <div className="text-[12px] font-semibold uppercase tracking-[1px] mb-1" style={{ color }}>
              {title}
            </div>
            <div className="text-[13px] text-[#333] leading-[1.6]">
              {desc}
            </div>
            {isNotFound && (
              <div className="text-[12px] text-[#888] italic mt-2">
                Try a public repository like: lantos1618/github.gg
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
