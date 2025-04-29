"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle2, Webhook, Bot, Shield, Code, GitBranch } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function SettingsPage() {
  const params = useParams()
  const { user, repo } = params as { user: string; repo: string }

  const [webhookUrl, setWebhookUrl] = useState("")
  const [secretToken, setSecretToken] = useState("")
  const [botEnabled, setBotEnabled] = useState(false)
  const [codeAnalysisEnabled, setCodeAnalysisEnabled] = useState(true)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const handleSaveWebhook = () => {
    // Simulate saving webhook configuration
    if (webhookUrl) {
      setSaveSuccess(true)
      setSaveError(false)
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      setSaveError(true)
      setSaveSuccess(false)
      setTimeout(() => setSaveError(false), 3000)
    }
  }

  const eventTypes = [
    { id: "push", name: "Push", description: "Any Git push to the repository" },
    { id: "pull_request", name: "Pull Request", description: "Pull request opened, closed, or synchronized" },
    { id: "issues", name: "Issues", description: "Issue opened, edited, closed, etc." },
    { id: "commit_comment", name: "Commit Comment", description: "Commit or diff commented on" },
    { id: "code_scan", name: "Code Scan", description: "Code scanning alerts" },
  ]

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Repository Settings</h1>
        <div className="text-sm text-muted-foreground">
          {user}/{repo}
        </div>
      </div>

      <Tabs defaultValue="webhooks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="bots">Bots & Apps</TabsTrigger>
          <TabsTrigger value="analysis">Code Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Webhooks allow external services to be notified when certain events happen in your repository.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Payload URL</Label>
                <Input
                  id="webhook-url"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="secret-token">Secret Token</Label>
                <Input
                  id="secret-token"
                  type="password"
                  placeholder="••••••••••••••••"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Used to validate webhook payloads for security.</p>
              </div>

              <div className="space-y-2">
                <Label>Event Triggers</Label>
                <div className="space-y-2">
                  {eventTypes.map((event) => (
                    <div key={event.id} className="flex items-start space-x-3 space-y-0">
                      <Switch
                        id={`event-${event.id}`}
                        defaultChecked={event.id === "push" || event.id === "code_scan"}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor={`event-${event.id}`}>{event.name}</Label>
                        <p className="text-xs text-muted-foreground">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Test Webhook</Button>
              <Button onClick={handleSaveWebhook}>Save Webhook</Button>
            </CardFooter>
          </Card>

          {saveSuccess && (
            <Alert variant="default" className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Your webhook has been saved successfully.</AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>Please provide a valid webhook URL.</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Bots & Integrations
              </CardTitle>
              <CardDescription>
                Configure automated bots to help with code reviews, testing, and deployments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="bot-toggle" className="font-medium">
                    Enable Code Analysis Bot
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically analyze code in pull requests and commits
                  </p>
                </div>
                <Switch id="bot-toggle" checked={botEnabled} onCheckedChange={setBotEnabled} />
              </div>

              <div className="space-y-2 pt-4">
                <Label htmlFor="bot-config">Bot Configuration</Label>
                <Textarea
                  id="bot-config"
                  placeholder="# YAML configuration for the bot
name: CodeAnalysisBot
version: 1.0
settings:
  autoReview: true
  severity: medium
  ignorePatterns:
    - '*.test.js'
    - 'docs/**'"
                  className="font-mono text-sm h-[200px]"
                  disabled={!botEnabled}
                />
                <p className="text-xs text-muted-foreground">Configure the bot behavior using YAML format.</p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="bot-type">Bot Type</Label>
                <Select disabled={!botEnabled} defaultValue="code-analysis">
                  <SelectTrigger id="bot-type">
                    <SelectValue placeholder="Select bot type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code-analysis">Code Analysis</SelectItem>
                    <SelectItem value="security-scanner">Security Scanner</SelectItem>
                    <SelectItem value="dependency-updater">Dependency Updater</SelectItem>
                    <SelectItem value="custom">Custom Bot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={!botEnabled}>Save Bot Configuration</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Code Analysis Settings
              </CardTitle>
              <CardDescription>Configure automated code analysis tools and quality checks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="flex flex-col space-y-1">
                  <Label htmlFor="analysis-toggle" className="font-medium">
                    Enable Code Analysis
                  </Label>
                  <p className="text-sm text-muted-foreground">Run automated code quality and security checks</p>
                </div>
                <Switch id="analysis-toggle" checked={codeAnalysisEnabled} onCheckedChange={setCodeAnalysisEnabled} />
              </div>

              <div className="space-y-2 pt-4">
                <Label>Analysis Tools</Label>
                <div className="space-y-2">
                  <div className="flex items-start space-x-3 space-y-0">
                    <Switch id="tool-linter" defaultChecked disabled={!codeAnalysisEnabled} />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="tool-linter">Code Linter</Label>
                      <p className="text-xs text-muted-foreground">Check code style and formatting issues</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-y-0">
                    <Switch id="tool-security" defaultChecked disabled={!codeAnalysisEnabled} />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="tool-security">Security Scanner</Label>
                      <p className="text-xs text-muted-foreground">Detect security vulnerabilities and issues</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-y-0">
                    <Switch id="tool-deps" defaultChecked disabled={!codeAnalysisEnabled} />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="tool-deps">Dependency Checker</Label>
                      <p className="text-xs text-muted-foreground">Check for outdated or vulnerable dependencies</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 space-y-0">
                    <Switch id="tool-complexity" disabled={!codeAnalysisEnabled} />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor="tool-complexity">Complexity Analyzer</Label>
                      <p className="text-xs text-muted-foreground">Measure code complexity and suggest improvements</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="analysis-branch">Analysis Target</Label>
                <div className="flex gap-2">
                  <Select disabled={!codeAnalysisEnabled} defaultValue="all-prs">
                    <SelectTrigger id="analysis-branch" className="flex-1">
                      <SelectValue placeholder="Select when to run analysis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-prs">All Pull Requests</SelectItem>
                      <SelectItem value="main-only">Main Branch Only</SelectItem>
                      <SelectItem value="all-branches">All Branches</SelectItem>
                      <SelectItem value="tagged-releases">Tagged Releases</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="gap-1" disabled={!codeAnalysisEnabled}>
                    <GitBranch className="h-4 w-4" />
                    Configure Branches
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled={!codeAnalysisEnabled}>Save Analysis Settings</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Policies
              </CardTitle>
              <CardDescription>Configure security policies and requirements for this repository.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3 space-y-0">
                <Switch id="require-reviews" defaultChecked />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="require-reviews">Require Code Reviews</Label>
                  <p className="text-xs text-muted-foreground">Require at least one approved review before merging</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <Switch id="require-checks" defaultChecked />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="require-checks">Require Status Checks</Label>
                  <p className="text-xs text-muted-foreground">Require branches to be up to date before merging</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 space-y-0">
                <Switch id="require-signatures" />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="require-signatures">Require Signed Commits</Label>
                  <p className="text-xs text-muted-foreground">Require all commits to be signed with GPG</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Security Policies</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
