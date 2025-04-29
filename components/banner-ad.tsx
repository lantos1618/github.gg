import { Code2Icon, ArrowRightIcon } from "lucide-react"

export default function BannerAd() {
  // This component includes different banner ad sizes for various placements
  return (
    <div className="space-y-8">
      {/* Leaderboard Banner (728x90) */}
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Leaderboard (728x90)</h3>
        <div className="w-[728px] h-[90px] bg-black border border-border/50 rounded-md overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-30"></div>
          <div className="flex h-full items-center">
            <div className="flex items-center px-4">
              <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center mr-3">
                <Code2Icon className="h-6 w-6 text-black" />
              </div>
              <span className="text-xl font-bold">GitHub.GG</span>
            </div>

            <div className="flex-1 px-4 border-l border-r border-border/50 h-full flex items-center">
              <p className="text-sm">
                <span className="font-bold">Understand code instantly with AI.</span>{" "}
                <span className="hidden md:inline text-muted-foreground">
                  Change github.com to github.gg in any repository URL.
                </span>
              </p>
            </div>

            <div className="px-4 h-full flex items-center">
              <div className="px-4 py-2 bg-primary rounded text-black font-medium text-sm flex items-center gap-1.5">
                Try Free <ArrowRightIcon className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Medium Rectangle (300x250) */}
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Medium Rectangle (300x250)</h3>
        <div className="w-[300px] h-[250px] bg-black border border-border/50 rounded-md overflow-hidden relative p-5 flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30"></div>

          <div className="flex items-center mb-4 z-10">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center mr-2">
              <Code2Icon className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg font-bold">GitHub.GG</span>
          </div>

          <h2 className="text-xl font-bold mb-3 z-10">Stop Wasting Time on Code Comprehension</h2>

          <p className="text-sm text-muted-foreground mb-4 z-10">
            Get AI-powered insights for any GitHub repository instantly.
          </p>

          <div className="bg-gray-900/70 p-3 rounded border border-border/50 mb-4 z-10">
            <p className="text-xs font-mono mb-1">Change URL:</p>
            <p className="text-xs font-mono">
              <span className="line-through text-red-400">github.com</span>
              <span className="text-green-400">/github.gg</span>
              <span>/repo</span>
            </p>
          </div>

          <div className="mt-auto z-10">
            <div className="px-4 py-2 bg-primary rounded text-black font-medium text-sm w-full text-center">
              Try GitHub.GG Free
            </div>
          </div>
        </div>
      </div>

      {/* Skyscraper (160x600) */}
      <div>
        <h3 className="text-sm text-muted-foreground mb-2">Skyscraper (160x600)</h3>
        <div className="w-[160px] h-[600px] bg-black border border-border/50 rounded-md overflow-hidden relative p-4 flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent opacity-30"></div>

          <div className="flex items-center mb-4 z-10">
            <div className="w-7 h-7 bg-primary rounded-sm flex items-center justify-center mr-2">
              <Code2Icon className="h-4 w-4 text-black" />
            </div>
            <span className="text-sm font-bold">GitHub.GG</span>
          </div>

          <h2 className="text-base font-bold mb-3 z-10">Understand Code Instantly</h2>

          <p className="text-xs text-muted-foreground mb-4 z-10">AI-powered insights for any GitHub repository.</p>

          <div className="h-[250px] bg-gray-900/50 rounded border border-border/50 mb-4 flex items-center justify-center z-10">
            <span className="text-xs text-gray-500">[Demo Image]</span>
          </div>

          <div className="space-y-3 mb-4 z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs">✓</span>
              </div>
              <span className="text-xs">AI Summaries</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs">✓</span>
              </div>
              <span className="text-xs">Save Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs">✓</span>
              </div>
              <span className="text-xs">Free Tier</span>
            </div>
          </div>

          <div className="mt-auto z-10">
            <div className="px-3 py-2 bg-primary rounded text-black font-medium text-xs w-full text-center">
              Try Free Today
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
