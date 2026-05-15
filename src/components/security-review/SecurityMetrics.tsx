import type { AnalysisData } from "@/components/analysis/AnalysisPageView";
import { ShieldAlert, ShieldCheck, ShieldX, AlertOctagon } from "lucide-react";

interface SecurityMetricsProps {
  data: AnalysisData;
}

const RISK_STYLE: Record<string, { bar: string; label: string; ring: string }> = {
  critical: { bar: "bg-red-600",   label: "text-red-600",    ring: "ring-red-500/30" },
  high:     { bar: "bg-red-500",   label: "text-red-500",    ring: "ring-red-500/30" },
  medium:   { bar: "bg-orange-500",label: "text-orange-500", ring: "ring-orange-500/30" },
  low:      { bar: "bg-yellow-500",label: "text-yellow-600", ring: "ring-yellow-500/30" },
};

const SEVERITY_STYLE: Record<string, { dot: string; text: string; bg: string }> = {
  critical: { dot: "bg-red-600",    text: "text-red-700",    bg: "bg-red-50" },
  high:     { dot: "bg-red-500",    text: "text-red-600",    bg: "bg-red-50" },
  medium:   { dot: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
  low:      { dot: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" },
  info:     { dot: "bg-blue-400",   text: "text-blue-600",   bg: "bg-blue-50" },
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;

export function SecurityMetrics({ data }: SecurityMetricsProps) {
  const overallScore = data.overallScore ?? 0;
  const risk = (data.riskLevel ?? "medium") as keyof typeof RISK_STYLE;
  const riskStyle = RISK_STYLE[risk] ?? RISK_STYLE.medium;
  const vulns = data.vulnerabilities ?? [];
  const attackSurface = data.attackSurface ?? [];

  const severityCounts = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    count: vulns.filter((v) => v.severity === sev).length,
  })).filter((s) => s.count > 0);

  return (
    <div data-testid="security-metrics-container" className="mb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Risk Level Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${riskStyle.bar}`} />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Risk Level
            </h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold tracking-tight uppercase ${riskStyle.label}`}>
                {risk}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {vulns.length} finding{vulns.length === 1 ? "" : "s"} across{" "}
              {new Set(vulns.map((v) => v.category)).size} categor
              {new Set(vulns.map((v) => v.category)).size === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>

        {/* Overall Score Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          <div
            className={`absolute top-0 left-0 w-1 h-full ${
              overallScore < 40
                ? "bg-red-500"
                : overallScore < 60
                ? "bg-orange-500"
                : overallScore < 80
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
          />
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Security Score
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{overallScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                overallScore < 40
                  ? "bg-red-500"
                  : overallScore < 60
                  ? "bg-orange-500"
                  : overallScore < 80
                  ? "bg-yellow-500"
                  : "bg-green-500"
              }`}
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Severity Breakdown */}
      {severityCounts.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <ShieldX className="w-4 h-4 text-red-500" />
            Findings by Severity
          </h3>
          <div className="flex flex-wrap gap-2">
            {severityCounts.map(({ severity, count }) => {
              const s = SEVERITY_STYLE[severity];
              return (
                <div
                  key={severity}
                  className={`flex items-center gap-2 rounded-full px-3 py-1 ${s.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  <span className={`text-xs font-medium uppercase tracking-wide ${s.text}`}>
                    {severity}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Findings */}
      {vulns.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-orange-500" />
            Top Findings
          </h3>
          <div className="space-y-3">
            {vulns
              .slice()
              .sort(
                (a, b) =>
                  SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
              )
              .slice(0, 8)
              .map((v, i) => {
                const s = SEVERITY_STYLE[v.severity] ?? SEVERITY_STYLE.info;
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <span className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-medium uppercase tracking-wide ${s.text}`}>
                          {v.severity}
                        </span>
                        <span className="text-xs text-muted-foreground">{v.category}</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-0.5">{v.title}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{v.file}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Attack Surface */}
      {attackSurface.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4">Attack Surface</h3>
          <div className="flex flex-wrap gap-2">
            {attackSurface.map((s, i) => (
              <span
                key={i}
                className="text-xs font-mono bg-muted text-foreground/80 px-2 py-1 rounded border"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
