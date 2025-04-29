import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <h2 className="text-2xl">Documentation Page Not Found</h2>
        <p className="text-muted-foreground">
          The documentation page you're looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/docs">Return to Docs</Link>
        </Button>
      </div>
    </div>
  )
}
