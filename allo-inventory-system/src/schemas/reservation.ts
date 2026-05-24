import { z } from "zod";

export const createReservationSchema = z.object({
  productId: z.string().uuid({ message: "Invalid Product ID format" }),
  warehouseId: z.string().uuid({ message: "Invalid Warehouse ID format" }),
  quantity: z
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" })
    .max(1000, { message: "Cannot reserve more than 1000 items in a single booking" }),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
