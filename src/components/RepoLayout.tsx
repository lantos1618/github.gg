import { ReactNode } from 'react';

interface RepoLayoutProps {
  children: ReactNode;
}

export function RepoLayout({ children }: RepoLayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col items-center justify-start py-12">
      <div className="w-full max-w-5xl px-8 py-8">
        {children}
      </div>
    </div>
  );
} 