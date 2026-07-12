import { NextResponse } from "next/server"
import { analyzeFuelFraud } from "@/lib/data"

export async function POST(request: Request) {
  const body = await request.json()
  const result = await analyzeFuelFraud(body)
  return NextResponse.json(result)
}
