import jwt from 'jsonwebtoken';
import { db } from '@/db';
import { user, account } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Development user data
const DEV_USERS = [
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

export interface DevSession {
  user: {
    id: string;
    email: string;
    name: string;
    image: string;
    githubUsername: string;
  };
  expiresAt: number;
}

export class DevAuth {
  private secret: string;

  constructor() {
    this.secret = process.env.BETTER_AUTH_SECRET || 'dev-secret-key-for-local-development-only';
  }

  // Create a JWT token for a user
  createToken(userId: string): string {
    const user = DEV_USERS.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      githubUsername: user.githubUsername,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };

    return jwt.sign(payload, this.secret);
  }

  // Verify and decode a JWT token
  verifyToken(token: string): DevSession | null {
    try {
      const decoded = jwt.verify(token, this.secret) as Record<string, unknown>;
      
      const user = DEV_USERS.find(u => u.id === decoded.userId);
      if (!user) {
        return null;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          githubUsername: user.githubUsername,
        },
        expiresAt: decoded.exp * 1000, // Convert to milliseconds
      };
    } catch {
      return null;
    }
  }

  // Get all available dev users
  getDevUsers() {
    return DEV_USERS.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      githubUsername: user.githubUsername,
    }));
  }

  // Create or get user in database
  async ensureUserInDatabase(userId: string) {
    const devUser = DEV_USERS.find(u => u.id === userId);
    if (!devUser) {
      throw new Error('User not found');
    }

    // Check if user exists in database
    const existingUser = await db.query.user.findFirst({
      where: eq(user.id, userId),
    });

    if (!existingUser) {
      // Create user in database
      await db.insert(user).values({
        id: devUser.id,
        email: devUser.email,
        name: devUser.name,
        image: devUser.image,
      });

      // Create account record
      await db.insert(account).values({
        id: `dev-account-${devUser.id}`,
        userId: devUser.id,
        providerId: 'github',
        accountId: devUser.githubUsername,
        scope: 'read:user',
      });
    }

    return devUser;
  }
}

// Export singleton instance
export const devAuth = new DevAuth(); 