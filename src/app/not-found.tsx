import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The page you&apos;re looking for doesn&apos;t exist. Try a GitHub-style URL like:
        </p>
        <div className="bg-gray-100 p-4 rounded-lg mb-6 text-left">
          <code className="text-sm text-gray-800">
            /[user]/[repo]/tree/[branch]/[path]
          </code>
          <div className="mt-2 text-xs text-gray-600">
            Example: /lantos1618/github.gg/tree/main/src
          </div>
        </div>
        <Link 
          href="/" 
          className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
} 