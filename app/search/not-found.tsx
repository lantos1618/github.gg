import Link from "next/link"

export default function SearchNotFound() {
  return (
    <div className="container flex flex-col items-center justify-center py-16">
      <h1 className="text-4xl font-bold mb-4">Search Not Available</h1>
      <p className="text-lg text-muted-foreground mb-8">
        The search functionality is currently unavailable. Please try again later.
      </p>
      <Link href="/" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
        Return Home
      </Link>
    </div>
  )
}
