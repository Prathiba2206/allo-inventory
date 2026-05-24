import { ReservationStatus } from "@prisma/client";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Inventory {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  warehouse?: Warehouse;
}

export interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: Product;
  warehouse?: Warehouse;
}

export interface ProductWithInventory extends Product {
  inventories: (Inventory & {
    warehouse: Warehouse;
  })[];
}
