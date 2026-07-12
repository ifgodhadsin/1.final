import { NextResponse } from "next/server"
import { getTrips, createTrip } from "@/lib/data"

export async function GET() {
  const trips = await getTrips()
  return NextResponse.json({ trips })
}

export async function POST(request: Request) {
  const body = await request.json()
  const result = await createTrip(body)

  if (result.errors.length > 0) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  return NextResponse.json({ trip: result.trip }, { status: 201 })
}
