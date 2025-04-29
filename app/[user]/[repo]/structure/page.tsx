import { redirect } from "next/navigation"

interface PageProps {
  params: {
    user: string
    repo: string
  }
}

export default function StructurePage({ params }: PageProps) {
  const { user, repo } = params
  redirect(`/${user}/${repo}/diagram`)
}
