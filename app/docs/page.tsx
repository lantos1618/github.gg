import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start py-16 px-4">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-12 flex flex-col items-center">
          <div className="w-full max-w-md mb-8">
            <Image src="/github-gg-logo.png" alt="GitHub.GG" width={500} height={120} className="w-full h-auto" />
          </div>

          <div className="text-center space-y-6">
            <p className="text-lg">
              A <span className="font-bold">powerful tool</span> for analyzing GitHub repositories and providing
              valuable insights about <span className="text-primary">code quality</span>,{" "}
              <span className="text-primary">dependencies</span>, and more.
            </p>

            <p className="text-sm text-muted-foreground">
              For feature requests, issues, or other questions, contact us:
            </p>

            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/lantos1618"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src="/mystical-forest-spirit.png"
                    alt="@Lantos1618"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-primary">@Lantos1618</span>
              </a>

              <a
                href="https://github.com/nisten"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src="/diverse-professional-profiles.png"
                    alt="@nisten"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-primary">@nisten</span>
              </a>
            </div>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">How to Use</h2>

          <p className="mb-4">Simply visit any GitHub repository using our domain:</p>

          <div className="bg-[#161b22] p-4 rounded-md mb-6 font-mono text-sm overflow-x-auto">
            https://github.gg/owner/repository
          </div>

          <p className="mb-4">For example:</p>

          <div className="bg-[#161b22] p-4 rounded-md font-mono text-sm overflow-x-auto">
            https://github.gg/lantos1618/inkwell_test
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">Code Visualization</h3>
              <p className="text-sm text-muted-foreground">
                Visualize code structure with interactive diagrams to better understand complex repositories.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">Dependency Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Identify and analyze dependencies to understand potential vulnerabilities and outdated packages.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">Code Quality Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Get insights into code quality with automated analysis of complexity, duplication, and more.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-primary">Security Scanning</h3>
              <p className="text-sm text-muted-foreground">
                Automatically scan repositories for security vulnerabilities and potential issues.
              </p>
            </div>
          </div>
        </div>

        {/* Get Started */}
        <div className="w-full flex justify-center">
          <Button size="lg" className="px-8">
            <a href="https://github.gg" target="_blank" rel="noopener noreferrer">
              Try GitHub.GG Now
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
