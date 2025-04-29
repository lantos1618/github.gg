import { RocketIcon, ZapIcon, SparklesIcon } from "lucide-react"
import AdBanner from "./ad-banner"

interface RepoAdSectionProps {
  className?: string
}

export default function RepoAdSection({ className = "" }: RepoAdSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-medium mb-2">Sponsored Tools</h3>

      <AdBanner
        title="Supercharge Your Workflow"
        description="Get 50% off GitHub.GG Pro for the first 3 months. Unlimited repositories, advanced AI insights, and team collaboration."
        ctaText="Upgrade to Pro"
        icon={<RocketIcon className="h-5 w-5 text-primary" />}
        variant="primary"
      />

      <AdBanner
        title="Try GitHub Copilot"
        description="AI pair programming that helps you write code faster with less work. Integrates with your editor."
        ctaText="Learn More"
        ctaLink="https://github.com/features/copilot"
        icon={<SparklesIcon className="h-5 w-5 text-purple-400" />}
        variant="secondary"
      />

      <AdBanner
        title="Vercel Hosting"
        description="Deploy this repository with zero configuration. Get automatic previews, analytics, and more."
        ctaText="Deploy to Vercel"
        ctaLink="https://vercel.com"
        icon={<ZapIcon className="h-5 w-5 text-blue-400" />}
        variant="subtle"
      />
    </div>
  )
}
