import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createReservation } from "@/lib/reservation";
import { createReservationSchema } from "@/schemas/reservation";

export async function GET() {
  try {
    const reservations = await prisma.reservation.findMany({
      include: {
        product: true,
        warehouse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error("GET /api/reservations error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validationResult = createReservationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const { productId, warehouseId, quantity } = validationResult.data;

    const reservation = await createReservation(productId, warehouseId, quantity);

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/reservations error:", error);

    const errorMessage = error.message || "";

    if (errorMessage === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_STOCK",
          message: "The requested quantity is not available in the selected warehouse.",
        },
        { status: 409 }
      );
    }

    if (errorMessage === "INVENTORY_NOT_FOUND") {
      return NextResponse.json(
        {
          error: "NOT_FOUND",
          message: "No inventory record exists for the selected product and warehouse.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred during reservation.",
      },
      { status: 500 }
    );
  }
}
