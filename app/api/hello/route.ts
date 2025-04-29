import { NextResponse } from "next/server"

export async function GET() {
  // Return a simple JSON response
  return NextResponse.json({ message: "Hello World" })
}
