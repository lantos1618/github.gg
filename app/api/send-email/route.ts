import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to, from, subject, text } = body

    // In production, you would use Resend or another email service here
    console.log(`Sending email:
      To: ${to}
      From: ${from}
      Subject: ${subject}
      Text: ${text}
    `)

    // For demo purposes, we'll just log and return success
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
