'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 flex-shrink-0">
      <div className="w-full max-w-screen-xl mx-auto flex flex-col items-center justify-between gap-4 py-4 px-4 md:flex-row md:h-[60px] md:py-0">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          © {new Date().getFullYear()} GG. Not affiliated with GitHub, Inc.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/developers" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Developers
          </Link>
          <Link href="/pricing" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </Link>
          <p className="text-xs text-muted-foreground text-center md:text-right">
            GitHub and the GitHub logo are trademarks of GitHub, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
