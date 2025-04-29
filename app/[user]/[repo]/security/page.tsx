import { Badge } from "@/components/ui/badge"
import type { Metadata } from "next"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldIcon, AlertTriangleIcon, LockIcon, ShieldCheckIcon, ExternalLinkIcon } from "lucide-react"
import { getRepoData } from "@/lib/github"
import { analyzeRepositoryWithSocket } from "@/lib/socket-api-service"

export async function generateMetadata({ params }: { params: { user: string; repo: string } }): Promise<Metadata> {
  return {
    title: `Security · ${params.user}/${params.repo} - GitHub.GG`,
    description: `Security overview and vulnerabilities for ${params.user}/${params.repo}`,
  }
}

export default async function RepoSecurityPage({ params }: { params: { user: string; repo: string } }) {
  const repoData = await getRepoData(params.user, params.repo)

  // Use Socket API to analyze repository security
  const securityData = await analyzeRepositoryWithSocket(params.user, params.repo)

  return (
    <div className="container py-4">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Security</h1>
          <div className="flex items-center gap-3">
            <Button>Security overview</Button>
            <Button variant="outline" className="flex items-center gap-2">
              <ExternalLinkIcon className="h-4 w-4" />
              Socket Security
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-black/70 border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-primary" />
                Vulnerabilities
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  {securityData.overallScore.issues.critical + securityData.overallScore.issues.high} High
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                  {securityData.overallScore.issues.medium} Medium
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {securityData.overallScore.issues.low} Low
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {securityData.vulnerabilities.length > 0 ? (
                <div className="space-y-4">
                  {securityData.vulnerabilities.map((vuln) => (
                    <div key={vuln.id} className="border-b border-border/50 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            vuln.severity === "critical"
                              ? "bg-purple-500/20 text-purple-400"
                              : vuln.severity === "high"
                                ? "bg-red-500/20 text-red-400"
                                : vuln.severity === "medium"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {vuln.severity}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{vuln.cve || vuln.id}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{vuln.description}</p>
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">
                              {vuln.package} {vuln.currentVersion} → {vuln.patchedVersion}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No vulnerabilities found</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-black/70 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldIcon className="h-5 w-5 text-primary" />
                Security Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                  <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                    <span>Security policy</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      securityData.securityPolicies.hasSecurityPolicy
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {securityData.securityPolicies.hasSecurityPolicy ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                  <div className="flex items-center gap-3">
                    <LockIcon className="h-5 w-5 text-green-500" />
                    <span>Dependabot alerts</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      securityData.securityPolicies.hasDependabotEnabled
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {securityData.securityPolicies.hasDependabotEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                  <div className="flex items-center gap-3">
                    <ShieldIcon className="h-5 w-5 text-red-500" />
                    <span>Code scanning</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      securityData.securityPolicies.hasCodeScanning
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {securityData.securityPolicies.hasCodeScanning ? "Enabled" : "Disabled"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                  <div className="flex items-center gap-3">
                    <LockIcon className="h-5 w-5 text-green-500" />
                    <span>Secret scanning</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${
                      securityData.securityPolicies.hasSecretScanning
                        ? "bg-green-500/10 text-green-400 border-green-500/30"
                        : "bg-red-500/10 text-red-400 border-red-500/30"
                    }`}
                  >
                    {securityData.securityPolicies.hasSecretScanning ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black/70 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 flex items-center justify-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#1e293b" strokeWidth="10" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={
                        securityData.overallScore.grade === "A"
                          ? "#22c55e"
                          : securityData.overallScore.grade === "B"
                            ? "#3b82f6"
                            : securityData.overallScore.grade === "C"
                              ? "#eab308"
                              : securityData.overallScore.grade === "D"
                                ? "#f97316"
                                : "#ef4444"
                      }
                      strokeWidth="10"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * securityData.overallScore.score) / 100}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{securityData.overallScore.score}</span>
                    <span className="text-sm text-muted-foreground">Grade {securityData.overallScore.grade}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium mb-3">Dependency Analysis</h3>
                <div className="space-y-3">
                  {securityData.dependencies.map((dep) => (
                    <div key={dep.name} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-md">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            dep.securityScore.grade === "A"
                              ? "bg-green-500"
                              : dep.securityScore.grade === "B"
                                ? "bg-blue-500"
                                : dep.securityScore.grade === "C"
                                  ? "bg-yellow-500"
                                  : dep.securityScore.grade === "D"
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                          }`}
                        />
                        <span>{dep.name}</span>
                        <span className="text-xs text-muted-foreground">{dep.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-800">
                          {dep.vulnerabilities.length} issues
                        </span>
                        <Badge variant="outline" className="bg-gray-800/50">
                          {dep.securityScore.score}/100
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/70 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900/50 p-4 rounded-lg border border-border/50">
              <p className="text-sm text-muted-foreground">
                Based on the repository's security profile, here are some recommendations:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {securityData.vulnerabilities.map((vuln) => (
                  <li key={vuln.id} className="flex items-start gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span>
                      Update <strong>{vuln.package}</strong> to version {vuln.patchedVersion} to fix a {vuln.severity}{" "}
                      severity vulnerability
                    </span>
                  </li>
                ))}
                {!securityData.securityPolicies.hasCodeScanning && (
                  <li className="flex items-start gap-2">
                    <ShieldIcon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Enable code scanning to detect security vulnerabilities in your code</span>
                  </li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
