import { ReactNode } from 'react';

interface RepoLayoutProps {
  children: ReactNode;
}

export function RepoLayout({ children }: RepoLayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {children}
      </div>
    </div>
  );
} 