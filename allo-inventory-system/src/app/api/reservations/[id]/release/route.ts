import { NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  let id: string;
  try {
    const resolvedParams = await context.params;
    id = resolvedParams.id;
  } catch {
    id = (context.params as { id: string }).id;
  }

  if (!id) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Missing reservation ID" },
      { status: 400 }
    );
  }

  try {
    const reservation = await releaseReservation(id);
    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error(`POST /api/reservations/${id}/release error:`, error);

    const message = error.message || "";

    if (message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Reservation ID not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to release reservation" },
      { status: 500 }
    );
  }
}
