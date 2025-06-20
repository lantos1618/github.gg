import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const response = await auth.api.signOut({ headers: request.headers });
  return response;
} 