import { NextResponse } from "next/server"
import { getDrivers } from "@/lib/data"

export async function GET() {
  const drivers = await getDrivers()
  return NextResponse.json({ drivers })
}
