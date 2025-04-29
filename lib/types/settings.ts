export interface WebhookConfig {
  url: string
  secret?: string
  events: string[]
  active: boolean
}

export interface BotConfig {
  enabled: boolean
  type: "code-analysis" | "security-scanner" | "dependency-updater" | "custom"
  config: string
}

export interface AnalysisToolConfig {
  enabled: boolean
  name: string
  description: string
}

export interface CodeAnalysisConfig {
  enabled: boolean
  tools: AnalysisToolConfig[]
  targetBranches: string[]
  runOn: "all-prs" | "main-only" | "all-branches" | "tagged-releases"
}

export interface SecurityPolicy {
  requireReviews: boolean
  requireStatusChecks: boolean
  requireSignedCommits: boolean
}

export interface RepoSettings {
  webhooks: WebhookConfig[]
  bots: BotConfig[]
  codeAnalysis: CodeAnalysisConfig
  securityPolicies: SecurityPolicy
}
