'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** Minimal session hint — display data only, no tokens or secrets */
export interface SessionHint {
  userId: string;
  name: string | null;
  image: string | null;
  githubUsername: string | null;
  plan: string | null;
}

const SessionContext = createContext<SessionHint | null>(null);

export function SessionProvider({
  hint,
  children,
}: {
  hint: SessionHint | null;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={hint}>
      {children}
    </SessionContext.Provider>
  );
}

/** Synchronous session hint from server — no async hop, no flash */
export function useSessionHint() {
  return useContext(SessionContext);
}
