import { NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation";

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
    const reservation = await confirmReservation(id);
    return NextResponse.json(reservation);
  } catch (error: any) {
    console.error(`POST /api/reservations/${id}/confirm error:`, error);

    const message = error.message || "";

    if (message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Reservation ID not found" },
        { status: 404 }
      );
    }

    if (message === "RESERVATION_EXPIRED") {
      return NextResponse.json(
        {
          error: "RESERVATION_EXPIRED",
          message: "This reservation has expired and its stock hold was already released.",
        },
        { status: 410 }
      );
    }

    if (message === "RESERVATION_RELEASED") {
      return NextResponse.json(
        {
          error: "RESERVATION_RELEASED",
          message: "This reservation was canceled/released and cannot be confirmed.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to confirm reservation" },
      { status: 500 }
    );
  }
}
