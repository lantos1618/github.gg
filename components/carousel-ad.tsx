import { Code2Icon, BrainCircuitIcon, ClockIcon } from "lucide-react"

export default function CarouselAd() {
  // This component represents a LinkedIn/Facebook carousel ad set
  // Each slide would be used as a separate image in the carousel
  return (
    <div className="grid grid-cols-1 gap-8">
      {/* Slide 1: Introduction */}
      <div className="w-[1080px] h-[1080px] bg-black flex flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30" />

        <div className="z-10 flex flex-col items-center">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-primary rounded-md flex items-center justify-center">
              <Code2Icon className="h-10 w-10 text-black" />
            </div>
            <span className="text-5xl font-bold text-white">GitHub.GG</span>
          </div>

          <h1 className="text-7xl font-bold text-center mb-8 max-w-[800px] leading-tight">
            Stop Wasting Time on Code Comprehension
          </h1>

          <p className="text-3xl text-center text-gray-300 mb-12 max-w-[700px]">
            Introducing AI-powered code understanding for developers and teams
          </p>

          <div className="px-8 py-4 bg-primary rounded-lg text-black font-semibold text-2xl">Swipe to Learn More</div>
        </div>

        <div className="absolute bottom-8 right-8 text-white/50 text-lg">1/4</div>
      </div>

      {/* Slide 2: Feature 1 */}
      <div className="w-[1080px] h-[1080px] bg-black flex flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30" />

        <div className="z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8">
            <BrainCircuitIcon className="h-12 w-12 text-primary" />
          </div>

          <h2 className="text-6xl font-bold text-center mb-8">Instant AI Summaries</h2>

          <p className="text-3xl text-center text-gray-300 mb-12 max-w-[800px]">
            Get quick overviews of repositories, files, and code sections with AI-powered analysis.
          </p>

          <div className="w-[800px] h-[400px] rounded-lg border border-gray-700 bg-gray-900/50 flex items-center justify-center">
            <span className="text-gray-400">[Repository Summary UI Mockup]</span>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 text-white/50 text-lg">2/4</div>
      </div>

      {/* Slide 3: Feature 2 */}
      <div className="w-[1080px] h-[1080px] bg-black flex flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30" />

        <div className="z-10 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-8">
            <ClockIcon className="h-12 w-12 text-primary" />
          </div>

          <h2 className="text-6xl font-bold text-center mb-8">Save Hours of Time</h2>

          <p className="text-3xl text-center text-gray-300 mb-12 max-w-[800px]">
            Reduce the time spent understanding new or complex codebases from hours to minutes.
          </p>

          <div className="w-[800px] h-[400px] rounded-lg border border-gray-700 bg-gray-900/50 flex items-center justify-center">
            <span className="text-gray-400">[Time-saving Comparison Graphic]</span>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 text-white/50 text-lg">3/4</div>
      </div>

      {/* Slide 4: CTA */}
      <div className="w-[1080px] h-[1080px] bg-black flex flex-col items-center justify-center p-12 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-30" />

        <div className="z-10 flex flex-col items-center">
          <h2 className="text-7xl font-bold text-center mb-10">How to Get Started</h2>

          <div className="flex flex-col gap-8 mb-12">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-black text-3xl font-bold">
                1
              </div>
              <p className="text-3xl">Visit any GitHub repository</p>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-black text-3xl font-bold">
                2
              </div>
              <p className="text-3xl">
                Change <span className="line-through text-red-400">github.com</span> to{" "}
                <span className="text-primary">github.gg</span>
              </p>
            </div>

            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-black text-3xl font-bold">
                3
              </div>
              <p className="text-3xl">Instantly get AI-powered insights</p>
            </div>
          </div>

          <div className="px-8 py-4 bg-primary rounded-lg text-black font-semibold text-2xl mb-6">
            Try GitHub.GG Free Today
          </div>

          <p className="text-xl text-gray-400">Free tier available • Pro version for teams</p>
        </div>

        <div className="absolute bottom-8 right-8 text-white/50 text-lg">4/4</div>
      </div>
    </div>
  )
}
