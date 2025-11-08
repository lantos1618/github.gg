'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on home page (dashboard has its own footer)
  const isHomePage = pathname === '/';
  
  // Hide footer on repo pages (they have footer inside content area)
  const isRepoPage = pathname.match(/^\/[^/]+\/[^/]+/);
  
  if (isHomePage || isRepoPage) {
    return null;
  }
  
  return <Footer />;
}

