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
    <nav className={`sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 relative border-b border-gray-200`}>
      <div className="relative flex h-14 items-center">
        {/* Logo/Brand - Always visible */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0 px-4 sm:px-6 z-10">
          <span className="font-bold sm:hidden">gh.gg</span>
          <span className="font-bold hidden sm:inline">
            gh.gg
          </span>
        </Link>

        {/* Navigation Links - Positioned absolutely at sidebar edge on repo pages */}
        <div className={`hidden md:flex items-center gap-6 px-4 sm:px-6 transition-all duration-300 ${isRepoPage ? 'lg:absolute' : 'ml-8'} ${navLinksMargin}`}>
          <Link
            href="/users"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            👥 Profiles
          </Link>
          <Link
            href="/repos"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            📦 Repos
          </Link>
          <Link
            href="/arena"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            🏟️ Dev Arena
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <Link
              href="/dev"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              🔧 Dev Tools
            </Link>
          )}
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