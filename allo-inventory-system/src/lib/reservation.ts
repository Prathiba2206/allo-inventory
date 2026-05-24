import { prisma } from "./prisma";
import { ReservationStatus } from "@prisma/client";

export async function createReservation(
  productId: string,
  warehouseId: string,
  quantity: number
) {
  return await prisma.$transaction(async (tx) => {
    const inventories = await tx.$queryRaw<any[]>`
      SELECT * FROM "Inventory"
      WHERE "productId" = ${productId} AND "warehouseId" = ${warehouseId}
      LIMIT 1
      FOR UPDATE
    `;

    const inventory = inventories[0];
    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const available = inventory.totalUnits - inventory.reservedUnits;
    if (available < quantity) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedUnits: {
          increment: quantity,
        },
      },
    });

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const reservation = await tx.reservation.create({
      data: {
        productId,
        warehouseId,
        quantity,
        status: ReservationStatus.PENDING,
        expiresAt,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return reservation;
  });
}

export async function confirmReservation(reservationId: string) {
  return await prisma.$transaction(async (tx) => {
    const reservations = await tx.$queryRaw<any[]>`
      SELECT * FROM "Reservation"
      WHERE "id" = ${reservationId}
      LIMIT 1
      FOR UPDATE
    `;

    const reservation = reservations[0];
    if (!reservation) {
      throw new Error("RESERVATION_NOT_FOUND");
    }

    if (reservation.status === ReservationStatus.CONFIRMED) {
      return reservation;
    }

    if (reservation.status === ReservationStatus.RELEASED) {
      throw new Error("RESERVATION_RELEASED");
    }

    if (new Date(reservation.expiresAt) < new Date()) {
      await releaseExpiredReservationTx(tx, reservation);
      throw new Error("RESERVATION_EXPIRED");
    }

    const inventories = await tx.$queryRaw<any[]>`
      SELECT * FROM "Inventory"
      WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
      LIMIT 1
      FOR UPDATE
    `;

    const inventory = inventories[0];
    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        totalUnits: {
          decrement: reservation.quantity,
        },
        reservedUnits: {
          decrement: reservation.quantity,
        },
      },
    });

    const updatedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CONFIRMED,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return updatedReservation;
  });
}

export async function releaseReservation(reservationId: string) {
  return await prisma.$transaction(async (tx) => {
    const reservations = await tx.$queryRaw<any[]>`
      SELECT * FROM "Reservation"
      WHERE "id" = ${reservationId}
      LIMIT 1
      FOR UPDATE
    `;

    const reservation = reservations[0];
    if (!reservation) {
      throw new Error("RESERVATION_NOT_FOUND");
    }

    if (reservation.status !== ReservationStatus.PENDING) {
      return reservation;
    }

    await releaseExpiredReservationTx(tx, reservation);

    const updatedReservation = await tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.RELEASED,
      },
      include: {
        product: true,
        warehouse: true,
      },
    });

    return updatedReservation;
  });
}

export async function cleanupExpiredReservations() {
  const expiredReservations = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  console.log(`Found ${expiredReservations.length} expired reservations to clean up.`);

  const results = [];
  for (const reservation of expiredReservations) {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const currentReservations = await tx.$queryRaw<any[]>`
          SELECT * FROM "Reservation"
          WHERE "id" = ${reservation.id}
          LIMIT 1
          FOR UPDATE
        `;

        const currentRes = currentReservations[0];
        if (!currentRes || currentRes.status !== ReservationStatus.PENDING) {
          return null;
        }

        await releaseExpiredReservationTx(tx, currentRes);

        return await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            status: ReservationStatus.RELEASED,
          },
        });
      });

      if (updated) {
        results.push(updated);
      }
    } catch (error) {
      console.error(`Failed to cleanup expired reservation ${reservation.id}:`, error);
    }
  }

  return results;
}

async function releaseExpiredReservationTx(tx: any, reservation: any) {
  const inventories = await tx.$queryRaw<any[]>`
    SELECT * FROM "Inventory"
    WHERE "productId" = ${reservation.productId} AND "warehouseId" = ${reservation.warehouseId}
    LIMIT 1
    FOR UPDATE
  `;

  const inventory = inventories[0];
  if (inventory) {
    const decrementAmt = Math.min(reservation.quantity, inventory.reservedUnits);
    await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        reservedUnits: {
          decrement: decrementAmt,
        },
      },
    });
  }
}
