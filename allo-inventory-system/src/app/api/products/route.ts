import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        inventories: {
          include: {
            warehouse: true,
          },
          orderBy: {
            warehouse: {
              name: "asc",
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
