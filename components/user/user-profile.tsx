import Image from "next/image"
import { MapPinIcon, LinkIcon, CalendarIcon, BuildingIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

interface UserProfileProps {
  username: string
  userData: any
}

export default function UserProfile({ username, userData = {} }: UserProfileProps) {
  // Provide default empty object if userData is null or undefined
  const safeUserData = userData || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Sidebar */}
      <div className="md:col-span-1">
        <div className="flex flex-col items-center md:items-start">
          <div className="relative w-64 h-64 md:w-full md:h-auto aspect-square rounded-full overflow-hidden mb-4">
            <Image
              src={safeUserData.avatar_url || "/placeholder.svg?height=400&width=400&query=user avatar"}
              alt={username}
              fill
              className="object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold mb-1">{safeUserData.name || username}</h1>
          <h2 className="text-xl text-muted-foreground mb-4">{username}</h2>

          <p className="text-sm text-muted-foreground mb-4 text-center md:text-left">
            {safeUserData.bio || "No bio provided."}
          </p>

          <Button className="w-full mb-4">Follow</Button>

          <div className="flex flex-col gap-2 text-sm w-full">
            {safeUserData.company && (
              <div className="flex items-center gap-2">
                <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                <span>{safeUserData.company}</span>
              </div>
            )}

            {safeUserData.location && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                <span>{safeUserData.location}</span>
              </div>
            )}

            {safeUserData.blog && (
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <a
                  href={safeUserData.blog.startsWith("http") ? safeUserData.blog : `https://${safeUserData.blog}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline truncate"
                >
                  {safeUserData.blog.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}

            {safeUserData.created_at && (
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  Joined{" "}
                  {new Date(safeUserData.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-4 text-sm">
            <a href="#" className="flex items-center gap-1 hover:text-foreground">
              <span className="font-bold">{safeUserData.followers || 0}</span>
              <span className="text-muted-foreground">followers</span>
            </a>
            <a href="#" className="flex items-center gap-1 hover:text-foreground">
              <span className="font-bold">{safeUserData.following || 0}</span>
              <span className="text-muted-foreground">following</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:col-span-3">
        <Tabs defaultValue="repositories">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              value="repositories"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
            >
              Repositories
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="stars"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 px-6"
            >
              Stars
            </TabsTrigger>
          </TabsList>

          <TabsContent value="repositories" className="pt-6">
            <div className="space-y-4">
              {safeUserData.public_repos_data && safeUserData.public_repos_data.length > 0 ? (
                safeUserData.public_repos_data.map((repo: any) => (
                  <div key={repo.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-blue-500 hover:underline">
                          <Link href={`/${username}/${repo.name}`}>{repo.name}</Link>
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {repo.description || "No description provided."}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Star
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="flex items-center gap-1">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor:
                                repo.language === "JavaScript"
                                  ? "#f1e05a"
                                  : repo.language === "TypeScript"
                                    ? "#3178c6"
                                    : repo.language === "Python"
                                      ? "#3572A5"
                                      : repo.language === "Java"
                                        ? "#b07219"
                                        : repo.language === "Go"
                                          ? "#00ADD8"
                                          : repo.language === "Rust"
                                            ? "#dea584"
                                            : repo.language === "C#"
                                              ? "#178600"
                                              : repo.language === "C++"
                                                ? "#f34b7d"
                                                : "#8257e5",
                            }}
                          ></span>
                          {repo.language}
                        </span>
                      )}
                      <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">No repositories found</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="pt-6">
            <div className="text-center py-8 text-muted-foreground">No projects yet</div>
          </TabsContent>

          <TabsContent value="stars" className="pt-6">
            <div className="text-center py-8 text-muted-foreground">No starred repositories yet</div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
