# Allo Inventory

An inventory reservation system that handles high concurrency and prevents double-booking. Built with Next.js, Prisma, and PostgreSQL.

## How it works

The core problem in inventory systems is double-booking. If two customers try to reserve the last item at the exact same time, both might see it as available and succeed. 

To prevent this, this app uses PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside database transactions. When a user requests a hold:
1. The inventory row for that product/warehouse is queried and locked.
2. The system checks if available units satisfy the request.
3. If yes, it increments `reservedUnits` and creates a pending reservation.
4. If not, it fails immediately.

Because the row is locked during the check-and-update phase, concurrent requests are forced to queue. This guarantees that stock is never oversold.

### Stock Counters
Instead of deducting stock immediately upon reservation (since reservations can expire or be canceled), we use two counters:
* `totalUnits`: The physical stock in the warehouse.
* `reservedUnits`: Active reservations.
* Available stock is calculated dynamically: `totalUnits - reservedUnits`.

## Database Schema

```prisma
model Product {
  id           String        @id @default(uuid())
  name         String
  sku          String        @unique
  price        Float
  inventories  Inventory[]
  reservations Reservation[]
}

model Warehouse {
  id           String        @id @default(uuid())
  name         String
  location     String
  inventories  Inventory[]
  reservations Reservation[]
}

model Inventory {
  id            String    @id @default(uuid())
  productId     String
  warehouseId   String
  totalUnits    Int
  reservedUnits Int       @default(0)
  product       Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse     Warehouse @relation(fields: [warehouseId], references: [id], onDelete: Cascade)

  @@unique([productId, warehouseId])
}

model Reservation {
  id          String            @id @default(uuid())
  productId   String
  warehouseId String
  quantity    Int
  status      ReservationStatus @default(PENDING)
  expiresAt   DateTime
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
  product     Product           @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse   Warehouse         @relation(fields: [warehouseId], references: [id], onDelete: Cascade)
}
```

## Setup Instructions

### 1. Installation
Install the project dependencies:
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file at the root:
```env
DATABASE_URL="postgresql://postgres.mzfrtmuwbapumwunkcbb:PRram%4012345%23%21@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.mzfrtmuwbapumwunkcbb:PRram%4012345%23%21@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
```
Make sure to URL-encode any special characters in the password.

### 3. Run Migrations & Seed
Apply the schema migrations and run the seed script:
```bash
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

This seeds:
- Gaming Laptop (50 East / 30 West)
- 34" Monitor (5 East / 15 West)
- Ergonomic Keyboard (1 East / 80 West)

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

## Testing Concurrency
The East Coast warehouse has only 1 Ergonomic Keyboard. 
To test if row locking works:
1. Open two browser tabs on the dashboard page.
2. Click **Reserve** on the East warehouse keyboard (qty 1) in both tabs.
3. Submit the reservation forms at the same time.
4. One reservation will succeed, and the other will get a "Stock Unavailable" error.

## Expiry Sweep
Reservations automatically expire after 5 minutes. 
* Vercel cron job calls `/api/cron/release-expired` every minute.
* The endpoint scans for expired holds and safely returns their reserved units back to available stock.
* You can also manually trigger a sweep by clicking **Trigger Purge** on the UI.
