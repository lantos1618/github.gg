import Link from 'next/link';
import { StarCount } from './StarCount';
import { NavbarClient } from './NavbarClient';

export async function NavbarServer() {
  return (
    <nav className={`sticky top-0 z-50 w-full backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 relative`}>
      <div className="container flex h-14 items-center px-4 sm:px-6">
        {/* Logo/Brand */}
        <Link href="/" className="mr-auto flex items-center gap-2">
          <span className="font-bold sm:hidden">gh.gg</span>
          <span className="font-bold hidden sm:inline">
            github.gg
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-6 mr-4">
          <Link 
            href="/arena" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            🏟️ Dev Arena
          </Link>
          <Link 
            href="/pricing" 
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            💸 Pricing
          </Link>
        </div>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* Auth Button - Client component handles auth state */}
          <NavbarClient />
        </div>
      </div>
    </nav>
  );
} 