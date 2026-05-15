import { z } from 'zod';

export const SECURITY_SEVERITY = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type SecuritySeverity = (typeof SECURITY_SEVERITY)[number];

export const SECURITY_RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;
export type SecurityRiskLevel = (typeof SECURITY_RISK_LEVELS)[number];

export const securityVulnerabilitySchema = z.object({
  severity: z.enum(SECURITY_SEVERITY),
  category: z.string(),
  title: z.string(),
  file: z.string(),
  recommendation: z.string(),
});

export type SecurityVulnerability = z.infer<typeof securityVulnerabilitySchema>;

export const securityMetricSchema = z.object({
  metric: z.string(),
  score: z.number().min(0).max(100),
  reason: z.string(),
});

export type SecurityMetric = z.infer<typeof securityMetricSchema>;

export const securityReviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  riskLevel: z.enum(SECURITY_RISK_LEVELS),
  metrics: z.array(securityMetricSchema),
  vulnerabilities: z.array(securityVulnerabilitySchema),
  attackSurface: z.array(z.string()),
  markdown: z.string(),
});

export type SecurityReviewData = z.infer<typeof securityReviewSchema>;

export interface SecurityReviewResponse {
  review: SecurityReviewData;
  cached: boolean;
  stale: boolean;
  lastUpdated: string;
}
