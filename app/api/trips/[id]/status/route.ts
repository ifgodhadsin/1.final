import { NextResponse } from "next/server"
import { updateTripStatus } from "@/lib/data"

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json()
  const result = await updateTripStatus(params.id, body.status)

  if (result.errors.length > 0) {
    return NextResponse.json({ errors: result.errors }, { status: 400 })
  }

  return NextResponse.json({ trip: result.trip })
}
