'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on home page (dashboard has its own footer)
  const isHomePage = pathname === '/';
  
  if (isHomePage) {
    return null;
  }
  
  return <Footer />;
}

