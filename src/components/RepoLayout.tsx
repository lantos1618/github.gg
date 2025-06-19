import { ReactNode } from 'react';

interface RepoLayoutProps {
  children: ReactNode;
  className?: string;
}

export function RepoLayout({ children, className = "" }: RepoLayoutProps) {
  return (
    <div className={`min-h-screen p-8 bg-gray-50 ${className}`}>
      <div className="max-w-5xl mx-auto">
        {children}
      </div>
    </div>
  );
} 