import { Card, CardContent } from "@/components/ui/card"

export default function VideoAdStoryboard() {
  const scenes = [
    {
      duration: "0:00-0:03",
      description: "Developer looking frustrated staring at complex code on screen",
      voiceover: "Ever spent hours trying to understand someone else's code?",
      visualNotes: "Dark coding environment, close-up of confused expression",
    },
    {
      duration: "0:03-0:06",
      description: "Split screen showing GitHub repo URL transforming from github.com to github.gg",
      voiceover: "Just change github.com to github.gg...",
      visualNotes: "Animation of URL changing with typing sound effect",
    },
    {
      duration: "0:06-0:12",
      description: "Screen transforms to show AI-generated summary appearing alongside code",
      voiceover: "...and instantly get AI-powered insights that explain what the code does.",
      visualNotes: "Clean animation showing summary populating with highlighted code sections",
    },
    {
      duration: "0:12-0:18",
      description: "Quick demo of features: repository overview, file explanation, interactive chat",
      voiceover: "Understand repositories in minutes, not hours. Explore complex logic with AI assistance.",
      visualNotes: "Fast-paced sequence showing different features in action",
    },
    {
      duration: "0:18-0:22",
      description: "Developer looking satisfied, nodding with understanding",
      voiceover: "GitHub.GG helps developers at any level understand code faster and more efficiently.",
      visualNotes: "Show same developer now looking confident and productive",
    },
    {
      duration: "0:22-0:30",
      description: "GitHub.GG logo with tagline and call-to-action",
      voiceover: "Try GitHub.GG free today and transform how you understand code.",
      visualNotes: "Logo animation with 'Try Free' button prominent",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">30-Second Video Ad Storyboard</h2>

      <div className="grid gap-4">
        {scenes.map((scene, index) => (
          <Card key={index} className="bg-black border-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="md:w-1/4 flex-shrink-0">
                  <div className="rounded bg-gray-800 h-32 flex items-center justify-center mb-2 border border-gray-700">
                    <span className="text-gray-400 text-sm">Scene {index + 1}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{scene.duration}</p>
                </div>

                <div className="md:w-3/4">
                  <h3 className="font-medium mb-2">Description:</h3>
                  <p className="text-muted-foreground mb-3">{scene.description}</p>

                  <h3 className="font-medium mb-2">Voiceover:</h3>
                  <p className="italic text-muted-foreground mb-3">"{scene.voiceover}"</p>

                  <h3 className="font-medium mb-2">Visual Notes:</h3>
                  <p className="text-sm text-muted-foreground">{scene.visualNotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
