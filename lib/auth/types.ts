import type { DefaultSession } from 'next-auth';

export type AuthenticatedUser = {
  id: string;
  accessToken: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type AuthenticatedSession = {
  user: AuthenticatedUser;
  expires: string;
};

// Augment the NextAuth session type
declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      accessToken?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } & DefaultSession['user'];
  }
}
