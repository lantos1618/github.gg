import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code2Icon } from "lucide-react"

export default function BrandStyleGuide() {
  const colorPalette = [
    { name: "Primary Green", hex: "#2ecc71", usage: "Primary buttons, important accents, logo" },
    { name: "Dark Background", hex: "#121212", usage: "Page backgrounds, cards" },
    { name: "Dark Secondary", hex: "#1e1e1e", usage: "Secondary backgrounds, hover states" },
    { name: "Light Gray", hex: "#f5f5f5", usage: "Text on dark backgrounds" },
    { name: "Muted Gray", hex: "#a0a0a0", usage: "Secondary text, descriptions" },
    { name: "Border Color", hex: "#333333", usage: "Borders, dividers" },
    { name: "Blue Accent", hex: "#3498db", usage: "Secondary accent color, links" },
  ]

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">GitHub.GG Brand Style Guide</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A comprehensive guide for maintaining brand consistency across all GitHub.GG marketing materials.
        </p>
      </div>

      <Tabs defaultValue="logo" className="w-full mb-12">
        <TabsList className="grid grid-cols-4 w-full mb-8">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="tone">Tone & Voice</TabsTrigger>
        </TabsList>

        {/* Logo Section */}
        <TabsContent value="logo" className="mt-0">
          <Card className="bg-black border-border">
            <CardHeader>
              <CardTitle>Logo Usage</CardTitle>
              <CardDescription>Guidelines for using the GitHub.GG logo across different applications.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Primary Logo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-10 bg-black rounded-lg flex flex-col items-center justify-center border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
                        <Code2Icon className="h-7 w-7 text-black" />
                      </div>
                      <span className="text-3xl font-bold">GitHub.GG</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Standard Logo (Light Text)</span>
                  </div>

                  <div className="p-10 bg-white rounded-lg flex flex-col items-center justify-center border border-border">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
                        <Code2Icon className="h-7 w-7 text-black" />
                      </div>
                      <span className="text-3xl font-bold text-black">GitHub.GG</span>
                    </div>
                    <span className="text-sm text-gray-500">Inverse Logo (Dark Text)</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Logo Spacing</h3>
                <p className="text-muted-foreground mb-4">
                  Always maintain adequate clear space around the logo. The minimum clear space is equal to the height
                  of the icon.
                </p>
                <div className="p-10 bg-gray-900 rounded-lg border border-border flex items-center justify-center">
                  <div className="border-2 border-dashed border-gray-700 p-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
                        <Code2Icon className="h-7 w-7 text-black" />
                      </div>
                      <span className="text-3xl font-bold">GitHub.GG</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Logo Don'ts</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Don't change the logo colors outside of the approved palette</li>
                    <li>• Don't stretch or distort the logo</li>
                    <li>• Don't use the logo on busy backgrounds without proper contrast</li>
                    <li>• Don't add effects like shadows or outlines</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Alternative Uses</h3>
                  <p className="text-muted-foreground">
                    For social media avatars or small spaces, the icon can be used without the wordmark.
                  </p>
                  <div className="flex gap-4 mt-4">
                    <div className="w-12 h-12 bg-primary rounded-sm flex items-center justify-center">
                      <Code2Icon className="h-7 w-7 text-black" />
                    </div>
                    <div className="w-12 h-12 bg-black rounded-sm border border-primary flex items-center justify-center">
                      <Code2Icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Section */}
        <TabsContent value="colors" className="mt-0">
          <Card className="bg-black border-border">
            <CardHeader>
              <CardTitle>Color Palette</CardTitle>
              <CardDescription>
                The GitHub.GG color palette is designed to be modern, tech-forward, and approachable.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {colorPalette.map((color, index) => (
                  <div key={index} className="flex">
                    <div className="w-24 h-24 rounded-l-lg flex-shrink-0" style={{ backgroundColor: color.hex }}></div>
                    <div className="flex-1 border border-l-0 border-border rounded-r-lg p-4 bg-gray-900">
                      <h3 className="font-medium mb-1">{color.name}</h3>
                      <p className="text-sm font-mono mb-2">{color.hex}</p>
                      <p className="text-xs text-muted-foreground">{color.usage}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-lg font-medium">Color Usage Guidelines</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h4 className="font-medium mb-2">Primary Green</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use the primary green (#2ecc71) for main call-to-actions, important UI elements, and the logo.
                    </p>
                    <div className="flex gap-3">
                      <div className="px-4 py-2 bg-primary rounded-md text-black font-medium">Button</div>
                      <div className="px-4 py-2 border border-primary rounded-md text-primary font-medium">Outline</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Dark Backgrounds</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Use dark backgrounds for main content areas, with subtle gradient variations for visual interest.
                    </p>
                    <div className="h-16 rounded-md overflow-hidden">
                      <div className="h-full w-full bg-gradient-to-r from-black to-[#1e1e1e]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Typography Section */}
        <TabsContent value="typography" className="mt-0">
          <Card className="bg-black border-border">
            <CardHeader>
              <CardTitle>Typography</CardTitle>
              <CardDescription>Typography guidelines for consistent branding across all materials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Primary Typeface: Inter</h3>
                <p className="text-muted-foreground mb-6">
                  Inter is our primary typeface for all headings and body copy. It's a clean, modern sans-serif that
                  offers excellent readability across different sizes and weights.
                </p>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Heading 1 (36px/Bold)</h4>
                    <p className="text-4xl font-bold">Understand Code Instantly</p>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Heading 2 (30px/Bold)</h4>
                    <p className="text-3xl font-bold">AI-Powered Code Analysis</p>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Heading 3 (24px/Bold)</h4>
                    <p className="text-2xl font-bold">Save Time on Development</p>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Body (16px/Regular)</h4>
                    <p className="text-base">
                      GitHub.GG is an innovative web application designed to revolutionize how developers interact with
                      and understand code repositories.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm text-muted-foreground mb-2">Small/Caption (14px/Regular)</h4>
                    <p className="text-sm text-muted-foreground">
                      By simply changing "github.com" to "github.gg" in any repository URL, users instantly access
                      AI-powered insights.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Secondary Typeface: JetBrains Mono</h3>
                <p className="text-muted-foreground mb-6">
                  JetBrains Mono is used for code examples, technical information, and when we want to emphasize the
                  technical nature of GitHub.GG.
                </p>

                <div className="p-4 bg-gray-900 rounded border border-border font-mono">
                  <p className="mb-2 text-sm">Code example:</p>
                  <p className="text-green-400">https://github.gg/vercel/next.js</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Typography Don'ts</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Don't use more than two typefaces in a single design</li>
                    <li>• Don't use lightweight fonts below 16px size</li>
                    <li>• Don't use decorative fonts that conflict with our tech-focused brand</li>
                    <li>• Ensure sufficient contrast for readability</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Font Hierarchy</h3>
                  <p className="text-muted-foreground mb-4">
                    Maintain clear hierarchy in designs by using appropriate font sizes and weights.
                  </p>
                  <div className="space-y-2">
                    <div className="h-8 bg-primary/10 rounded w-full"></div>
                    <div className="h-6 bg-primary/10 rounded w-4/5"></div>
                    <div className="h-4 bg-primary/10 rounded w-3/5"></div>
                    <div className="h-3 bg-primary/10 rounded w-2/5"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tone & Voice Section */}
        <TabsContent value="tone" className="mt-0">
          <Card className="bg-black border-border">
            <CardHeader>
              <CardTitle>Tone & Voice</CardTitle>
              <CardDescription>Guidelines for how GitHub.GG communicates in writing and messaging.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Brand Voice</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-lg border border-border bg-gray-900">
                    <h4 className="font-medium mb-3">Confident & Knowledgeable</h4>
                    <p className="text-muted-foreground text-sm">
                      We speak with authority on technical topics, but avoid being condescending or overly complex.
                    </p>
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-gray-900">
                    <h4 className="font-medium mb-3">Helpful & Empowering</h4>
                    <p className="text-muted-foreground text-sm">
                      We emphasize how our tool helps developers achieve their goals and overcome obstacles.
                    </p>
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-gray-900">
                    <h4 className="font-medium mb-3">Slightly Playful</h4>
                    <p className="text-muted-foreground text-sm">
                      While professional, we use a conversational tone and occasional tech-related humor.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Messaging Examples</h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Headlines</h4>
                    <div className="p-4 rounded border border-border bg-gray-900 space-y-3">
                      <p className="text-xl">"Understand Code Instantly with AI."</p>
                      <p className="text-xl">"Stop Wasting Time on Code Comprehension."</p>
                      <p className="text-xl">"The AI-Powered Assistant for Every GitHub Repository."</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Benefit-Driven Messages</h4>
                    <div className="p-4 rounded border border-border bg-gray-900 space-y-3">
                      <p>"Understand any codebase in minutes, not hours."</p>
                      <p>"Onboard new team members faster and easier."</p>
                      <p>"Make code reviews more efficient and effective."</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Call to Action</h4>
                    <div className="p-4 rounded border border-border bg-gray-900 space-y-3">
                      <p>"Try GitHub.GG Free Today!"</p>
                      <p>"Transform Your Code Workflow - Visit GitHub.GG Now."</p>
                      <p>"Get Instant AI Insights: Just Change 'github.com' to 'github.gg'."</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Do's</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Focus on benefits rather than just features</li>
                    <li>• Speak directly to the developer audience</li>
                    <li>• Use active voice and clear, concise language</li>
                    <li>• Emphasize time savings and improved understanding</li>
                    <li>• Balance technical accuracy with approachability</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Don'ts</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Use overly technical jargon that might alienate some users</li>
                    <li>• Make exaggerated claims about AI capabilities</li>
                    <li>• Use a formal or corporate tone that feels impersonal</li>
                    <li>• Speak negatively about competitors or other tools</li>
                    <li>• Use language that might date quickly in the fast-moving AI space</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
