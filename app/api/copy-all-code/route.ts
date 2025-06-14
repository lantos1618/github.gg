import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRepositoryAsText } from '@/lib/github'

export async function POST(request: Request) {
  try {
    // Get the authenticated session
    const session = await getServerSession(authOptions)
    
    // Parse the request body
    const { owner, repo, branch } = await request.json()
    
    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Missing required parameters: owner and repo are required' },
        { status: 400 }
      )
    }

    // Get the repository content as text
    const { files, error } = await getRepositoryAsText(
      owner,
      repo,
      branch || 'main', // Default to 'main' if no branch is provided
      session?.accessToken as string | undefined
    )

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch repository content: ${error}` },
        { status: 500 }
      )
    }

    // Format the files into a single string with file headers
    const formattedContent = files
      .map(file => {
        const header = `// File: ${file.path}\n${'='.repeat(80)}\n`
        const content = file.truncated 
          ? '// File too large to display\n'
          : file.content
        const footer = '\n\n'
        return header + content + footer
      })
      .join('\n')

    return NextResponse.json({
      content: formattedContent,
      fileCount: files.length,
      totalSize: formattedContent.length,
      truncated: files.some(f => f.truncated)
    })

  } catch (error) {
    console.error('Error in copy-all-code API route:', error)
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    )
  }
}
