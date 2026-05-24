import { NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/reservation";

export async function POST() {
  try {
    const cleaned = await cleanupExpiredReservations();
    return NextResponse.json({
      success: true,
      message: `Successfully released ${cleaned.length} expired reservations.`,
      cleaned,
    });
  } catch (error) {
    console.error("POST /api/cleanup error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to cleanup reservations" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cleaned = await cleanupExpiredReservations();
    return NextResponse.json({
      success: true,
      message: `Successfully released ${cleaned.length} expired reservations.`,
      cleaned,
    });
  } catch (error) {
    console.error("GET /api/cleanup error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to cleanup reservations" },
      { status: 500 }
    );
  }
}
