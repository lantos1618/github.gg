'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavbarLinks() {
  const pathname = usePathname();
  const isRepoPage = pathname?.match(/^\/[^/]+\/[^/]+/);

  // On repo pages on desktop, position links at sidebar edge (default to expanded width)
  const navLinksMargin = isRepoPage ? 'lg:ml-64' : '';

  return (
    <div className={`hidden md:flex items-center gap-8 px-4 sm:px-6 transition-all duration-300 ${isRepoPage ? 'lg:absolute' : 'ml-8'} ${navLinksMargin}`}>
      <Link
        href="/users"
        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
      >
        Profiles
      </Link>
      <Link
        href="/repos"
        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
      >
        Repos
      </Link>
      <Link
        href="/arena"
        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
      >
        Dev Rank
      </Link>
      <Link
        href="/wrapped"
        className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
      >
        Wrapped
      </Link>
    </div>
  );
}

