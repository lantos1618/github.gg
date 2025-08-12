export interface User {
  id: string;
  email: string;
  name: string;
  image: string;
  githubUsername?: string;
}

export interface AuthInterface {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  checkSession?: () => Promise<void>;
  // Dev-specific method (optional)
  signInWithUserId?: (userId: string) => Promise<void>;
}

export interface DevUser {
  id: string;
  email: string;
  name: string;
  image: string;
  githubUsername: string;
}

export interface DevSession {
  user: DevUser;
  expiresAt: number;
}

// Available dev users for development mode
export const DEV_USERS: DevUser[] = [
  {
    id: 'dev-user-1',
    email: 'dev@github.gg',
    name: 'Development User',
    image: 'https://github.com/github.png',
    githubUsername: 'dev-user',
  },
  {
    id: 'dev-user-2', 
    email: 'admin@github.gg',
    name: 'Admin User',
    image: 'https://github.com/github.png',
    githubUsername: 'admin-user',
  }
];
