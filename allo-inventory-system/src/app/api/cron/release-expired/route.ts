import { NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/reservation";

export async function GET() {
  try {
    const released = await cleanupExpiredReservations();

    console.log(`[CRON] Released ${released.length} expired reservations`);

    return NextResponse.json({
      success: true,
      releasedCount: released.length,
      releasedIds: released.map((r) => r.id),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON] release-expired failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Cron job failed to release expired reservations",
      },
      { status: 500 }
    );
  }
}
