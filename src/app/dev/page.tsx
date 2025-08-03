import { DevSignIn } from '@/components/DevSignIn';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function DevPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Development Mode</h1>
          <p className="text-muted-foreground">
            This page is only available in development mode
          </p>
          <Badge variant="outline">NODE_ENV: {process.env.NODE_ENV}</Badge>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  Test authentication with development users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DevSignIn />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Development Features</CardTitle>
                <CardDescription>
                  Available in development mode
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>JWT-based authentication</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>No external API keys required</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>Local PostgreSQL database</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>Hot reload development</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>Mock data for testing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>Analytics logging to console</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">✅</Badge>
                  <span>Mock GitHub repositories</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Current development configuration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>NODE_ENV:</span>
                  <Badge variant="outline">{process.env.NODE_ENV}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>USE_DEV_AUTH:</span>
                  <Badge variant="outline">{process.env.NEXT_PUBLIC_USE_DEV_AUTH}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>DATABASE_URL:</span>
                  <Badge variant="outline">Configured</Badge>
                </div>
                <div className="flex justify-between">
                  <span>BETTER_AUTH_SECRET:</span>
                  <Badge variant="outline">Set</Badge>
                </div>
                <div className="flex justify-between">
                  <span>POSTHOG_KEY:</span>
                  <Badge variant="outline">
                    {process.env.NEXT_PUBLIC_POSTHOG_KEY ? 'Configured' : 'Not Set (Dev Mode)'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mock GitHub Repositories</CardTitle>
            <CardDescription>
              Available repositories for testing in development mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">dev/dev-project</h4>
                  <p className="text-sm text-muted-foreground">
                    A sample development project for testing GitHub.gg features
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">JavaScript</Badge>
                    <Badge variant="outline">⭐ 15</Badge>
                    <Badge variant="outline">Apache-2.0</Badge>
                  </div>
                </div>
                <Link 
                  href="/dev/dev-project" 
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>
              What to do after setting up development mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">1. Test Authentication</h4>
                <p className="text-sm text-muted-foreground">
                  Use the sign-in form above to test with development users
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">2. Explore Mock Repositories</h4>
                <p className="text-sm text-muted-foreground">
                  Visit the mock repositories above to test the full app
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">3. Run Tests</h4>
                <p className="text-sm text-muted-foreground">
                  Execute <code className="bg-muted px-1 rounded">bun test</code> to run all tests
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">4. Database Management</h4>
                <p className="text-sm text-muted-foreground">
                  Use <code className="bg-muted px-1 rounded">bun run db:studio</code> to view data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 