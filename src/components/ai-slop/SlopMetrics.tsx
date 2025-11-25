import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisData } from "@/components/analysis/GenericAnalysisView";
import { AlertTriangle, CheckCircle2, XCircle, AlertOctagon } from "lucide-react";

interface SlopMetricsProps {
  data: AnalysisData;
}

export function SlopMetrics({ data }: SlopMetricsProps) {
  const aiPercentage = data.aiGeneratedPercentage || 0;
  const qualityScore = data.overallScore || 0;

  return (
    <div className="mb-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AI Slop Score Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
          {/* Status Bar */}
          <div className={`absolute top-0 left-0 w-1 h-full ${
             aiPercentage > 50 ? "bg-red-500" : aiPercentage > 30 ? "bg-orange-500" : "bg-green-500"
          }`} />
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" />
              AI Generated Content
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {aiPercentage}%
              </span>
              <span className="text-sm text-muted-foreground">detected</span>
            </div>
          </div>
          
           <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${
                  aiPercentage > 50 ? "bg-red-500" : aiPercentage > 30 ? "bg-orange-500" : "bg-green-500"
                }`}
                style={{ width: `${aiPercentage}%` }}
              />
            </div>
        </div>

        {/* Quality Score Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between relative overflow-hidden">
           {/* Status Bar */}
           <div className={`absolute top-0 left-0 w-1 h-full ${
            qualityScore < 60 ? "bg-red-500" : qualityScore < 80 ? "bg-orange-500" : "bg-green-500"
          }`} />
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Overall Quality Score
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {qualityScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="mt-4 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                qualityScore < 60 ? "bg-red-500" : qualityScore < 80 ? "bg-orange-500" : "bg-green-500"
              }`}
              style={{ width: `${qualityScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Detected Patterns List - Simplified */}
      {data.detectedPatterns && data.detectedPatterns.length > 0 && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Identified Issues
          </h3>
          <div className="space-y-3">
              {data.detectedPatterns.map((pattern, i) => (
                <div key={i} className="flex gap-3 items-start group">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{pattern}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
