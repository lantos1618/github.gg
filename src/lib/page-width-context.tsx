'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type PageWidth = 'focused' | 'wide';

const PageWidthContext = createContext<{ width: PageWidth; toggle: () => void }>({
  width: 'focused',
  toggle: () => {},
});

export function PageWidthProvider({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState<PageWidth>('focused');

  useEffect(() => {
    const saved = localStorage.getItem('gg-page-width') as PageWidth;
    if (saved === 'wide') setWidth('wide');
  }, []);

  const toggle = () => {
    const next = width === 'focused' ? 'wide' : 'focused';
    setWidth(next);
    localStorage.setItem('gg-page-width', next);
  };

  return (
    <PageWidthContext.Provider value={{ width, toggle }}>
      {children}
    </PageWidthContext.Provider>
  );
}

export function usePageWidth() {
  return useContext(PageWidthContext);
}

export function getWidthClass(width: PageWidth, base: 'default' | 'narrow' = 'default'): string {
  if (width === 'wide') return 'max-w-7xl';
  return base === 'narrow' ? 'max-w-[900px]' : 'max-w-5xl';
}
