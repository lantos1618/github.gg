'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Zap, GitBranch } from 'lucide-react';

export default function InstallPage() {
  const handleInstall = () => {
    const appName = process.env.NEXT_PUBLIC_GITHUB_APP_NAME || 'gh-gg-dev';
    const installUrl = `https://github.com/apps/${appName}/installations/new`;
    window.open(installUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Install GitHub.gg App
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get enhanced repository analysis with access to private repositories, 
            real-time webhooks, and automated insights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Secure & Private
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Access to private repositories
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  No code or secrets exposed
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  GitHub App permissions only
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Enhanced Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Real-time analysis on pushes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Automated PR comments
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  Higher rate limits (5,000 req/hr)
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Permissions Required</CardTitle>
            <CardDescription>
              The GitHub App needs these permissions to provide enhanced analysis:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Repository Permissions</h4>
                <div className="space-y-1">
                  <Badge variant="secondary">Contents: Read-only</Badge>
                  <Badge variant="secondary">Metadata: Read-only</Badge>
                  <Badge variant="secondary">Pull requests: Read & write</Badge>
                  <Badge variant="secondary">Issues: Read & write</Badge>
                  <Badge variant="secondary">Commit statuses: Read & write</Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Events</h4>
                <div className="space-y-1">
                  <Badge variant="outline">Push</Badge>
                  <Badge variant="outline">Pull request</Badge>
                  <Badge variant="outline">Installation</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            onClick={handleInstall} 
            size="lg" 
            className="text-lg px-8 py-4"
          >
            <GitBranch className="mr-2 h-5 w-5" />
            Install GitHub.gg App
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            You&apos;ll be redirected to GitHub to complete the installation
          </p>
        </div>

        <div className="mt-12 text-center">
          <h3 className="text-lg font-semibold mb-4">What happens after installation?</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-medium">Install App</h4>
              <p className="text-sm text-gray-600">Choose repositories to grant access</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-medium">Webhook Setup</h4>
              <p className="text-sm text-gray-600">Receive real-time repository events</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-medium">Enhanced Analysis</h4>
              <p className="text-sm text-gray-600">Get insights on pushes and PRs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 