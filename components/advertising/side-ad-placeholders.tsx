import Image from "next/image"
import { ExternalLinkIcon, ServerIcon, CloudIcon, DatabaseIcon, GlobeIcon } from "lucide-react"

interface SideAdPlaceholdersProps {
  position: "left" | "right"
}

export default function SideAdPlaceholders({ position }: SideAdPlaceholdersProps) {
  // List of placeholder advertisers with images and icons
  const advertisers = [
    {
      name: "vercel",
      color: "bg-black text-white border-gray-700",
      image: "/placeholder.svg?height=120&width=120",
      icon: <ServerIcon className="h-4 w-4" />,
    },
    {
      name: "ovh",
      color: "bg-blue-600/10 text-blue-400 border-blue-800/30",
      image: "/placeholder.svg?height=120&width=120",
      icon: <CloudIcon className="h-4 w-4" />,
    },
    {
      name: "vultr",
      color: "bg-indigo-600/10 text-indigo-400 border-indigo-800/30",
      image: "/placeholder.svg?height=120&width=120",
      icon: <DatabaseIcon className="h-4 w-4" />,
    },
    {
      name: "aws",
      color: "bg-orange-500/10 text-orange-400 border-orange-800/30",
      image: "/placeholder.svg?height=120&width=120",
      icon: <GlobeIcon className="h-4 w-4" />,
    },
  ]

  return (
    <div className="w-full space-y-4 sticky top-20">
      <div className="text-xs text-muted-foreground mb-2">Sponsored</div>

      {advertisers.map((advertiser, index) => (
        <a
          key={index}
          href="#"
          className={`${advertiser.color} block rounded-md border overflow-hidden hover:opacity-90 transition-opacity`}
        >
          <div className="relative w-full aspect-square">
            <Image
              src={advertiser.image || "/placeholder.svg"}
              alt={`${advertiser.name} advertisement`}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-2 text-xs font-medium flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              {advertiser.icon}
              {advertiser.name}
            </span>
            <ExternalLinkIcon className="h-3 w-3" />
          </div>
        </a>
      ))}
    </div>
  )
}
