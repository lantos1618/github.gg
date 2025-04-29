import {
  ExternalLinkIcon,
  ServerIcon,
  CloudIcon,
  DatabaseIcon,
  GlobeIcon,
  CloudCogIcon,
  ShieldIcon,
} from "lucide-react"

export default function AdPlaceholders() {
  // List of placeholder advertisers with icons
  const advertisers = [
    { name: "vercel", color: "bg-black text-white", icon: <ServerIcon className="h-4 w-4" /> },
    { name: "ovh", color: "bg-blue-600 text-white", icon: <CloudIcon className="h-4 w-4" /> },
    { name: "vultr", color: "bg-indigo-600 text-white", icon: <DatabaseIcon className="h-4 w-4" /> },
    { name: "aws", color: "bg-orange-500 text-white", icon: <GlobeIcon className="h-4 w-4" /> },
    { name: "digitalocean", color: "bg-blue-500 text-white", icon: <CloudCogIcon className="h-4 w-4" /> },
    { name: "cloudflare", color: "bg-yellow-500 text-black", icon: <ShieldIcon className="h-4 w-4" /> },
  ]

  return (
    <div className="w-full overflow-hidden">
      <div className="text-xs text-muted-foreground mb-2">Sponsored</div>
      <div className="flex flex-wrap gap-2">
        {advertisers.map((advertiser, index) => (
          <a
            key={index}
            href="#"
            className={`${advertiser.color} px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 hover:opacity-90 transition-opacity`}
          >
            {advertiser.icon}
            {advertiser.name}
            <ExternalLinkIcon className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  )
}
