import { Code2Icon, ClockIcon, BrainCircuitIcon } from "lucide-react"

export default function SocialMediaAd() {
  return (
    <div className="w-[1200px] h-[628px] bg-gradient-to-br from-black to-gray-900 flex flex-col items-center justify-center p-10 overflow-hidden relative">
      {/* Abstract code pattern background */}
      <div className="absolute inset-0 opacity-10">
        <div className="font-mono text-xs text-primary/50 leading-relaxed overflow-hidden">
          {Array(30)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="whitespace-nowrap">
                {Array(50)
                  .fill(0)
                  .map((_, j) => (
                    <span
                      key={j}
                    >{`${Math.random() > 0.5 ? "{" : "}"}${Math.random() > 0.5 ? "<" : ">"}${Math.random() > 0.5 ? "(" : ")"}`}</span>
                  ))}
              </div>
            ))}
        </div>
      </div>

      <div className="z-10 flex flex-col items-center">
        {/* Logo & Tagline */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-primary rounded-md flex items-center justify-center">
            <Code2Icon className="h-8 w-8 text-black" />
          </div>
          <span className="text-4xl font-bold text-white">GitHub.GG</span>
        </div>

        <h1 className="text-6xl font-bold text-center mb-6 max-w-[800px] leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Understand Code Instantly with AI
        </h1>

        <p className="text-2xl text-center text-gray-300 mb-10 max-w-[700px]">
          Change <span className="text-white font-semibold">github.com</span> to{" "}
          <span className="text-primary font-semibold">github.gg</span> and unlock AI-powered insights for any
          repository.
        </p>

        {/* Key features */}
        <div className="flex gap-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <BrainCircuitIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-gray-200">Instant AI Summaries</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <ClockIcon className="h-5 w-5 text-primary" />
            </div>
            <span className="text-gray-200">Save Hours of Time</span>
          </div>
        </div>

        {/* CTA */}
        <div className="px-8 py-4 bg-primary rounded-lg text-black font-semibold text-xl">Try GitHub.GG Free Today</div>
      </div>
    </div>
  )
}
