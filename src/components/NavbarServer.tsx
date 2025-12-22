'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StarCount } from './StarCount';
import { NavbarClient } from './NavbarClient';

export function NavbarServer() {
  const pathname = usePathname();
  const isRepoPage = pathname.match(/^\/[^/]+\/[^/]+/);

  // On repo pages on desktop, position links at sidebar edge (default to expanded width)
  const navLinksMargin = isRepoPage ? 'lg:ml-64' : '';

  return (
    <nav className={`fixed top-0 z-50 w-full bg-white transition-all duration-300 border-b border-gray-100`}>
      <div className="relative flex h-14 items-center">
        {/* Logo/Brand - Always visible */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 px-4 sm:px-6 z-10 group">
          <span className="font-bold text-xl tracking-tight text-black group-hover:opacity-80 transition-opacity">
            GG
          </span>
        </Link>

        {/* Navigation Links - Positioned absolutely at sidebar edge on repo pages */}
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

        {/* Navigation Actions - Right side */}
        <div className="flex items-center gap-4 ml-auto px-4 sm:px-6">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* Auth Button - Client component handles auth state */}
          <NavbarClient />
        </div>
      </div>
    </nav>
  );
}
