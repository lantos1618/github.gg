'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { StarCount } from './StarCount';

export function Navbar() {
  const { isSignedIn, isLoading, user, signIn, signOut, isSigningOut } = useAuth();

  return (
    <nav className="backdrop-blur bg-white/30 px-6 py-4 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo/Brand */}
        <Link href="/" className="text-2xl font-bold text-black hover:text-gray-800 transition-colors">
          github.gg
        </Link>

        {/* Navigation Actions */}
        <div className="flex items-center gap-4">
          {/* Star Button */}
          <StarCount owner="lantos1618" repo="github.gg" />

          {/* User Info (when signed in) */}
          {isSignedIn && user && (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              {user.image && (
                <img 
                  src={user.image} 
                  alt={user.name || 'User'} 
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="hidden sm:inline">{user.name || user.email}</span>
            </div>
          )}

          {/* Auth Button */}
          <button
            onClick={isSignedIn ? signOut : signIn}
            disabled={isLoading || isSigningOut}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isSigningOut ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{isSigningOut ? 'Signing out...' : 'Loading...'}</span>
              </>
            ) : isSignedIn ? (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Sign Out</span>
              </>
            ) : (
              <>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="hidden sm:inline">Sign In</span>
              </>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
} 