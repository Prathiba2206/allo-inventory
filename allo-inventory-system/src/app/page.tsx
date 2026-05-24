"use client";

import { useEffect, useState, startTransition } from "react";
import { Navbar } from "@/components/navbar";
import { CountdownTimer } from "@/components/reservations/countdown-timer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  RefreshCw,
  Plus,
  Check,
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  Database,
  CalendarDays,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { ReservationStatus } from "@prisma/client";

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  description: string | null;
  inventories: {
    id: string;
    productId: string;
    warehouseId: string;
    totalUnits: number;
    reservedUnits: number;
    warehouse: {
      id: string;
      name: string;
      location: string;
    };
  }[];
}

interface Reservation {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  product: {
    name: string;
    sku: string;
    price: number;
  };
  warehouse: {
    name: string;
    location: string;
  };
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const [bookingProduct, setBookingProduct] = useState<Product | null>(null);
  const [bookingInventory, setBookingInventory] = useState<Product["inventories"][0] | null>(null);
  const [reserveQuantity, setReserveQuantity] = useState<string>("5");
  const [isBookingSubmitting, setIsBookingSubmitting] = useState<boolean>(false);

  const [loadingConfirm, setLoadingConfirm] = useState<Record<string, boolean>>({});
  const [loadingRelease, setLoadingRelease] = useState<Record<string, boolean>>({});
  const [isCleaning, setIsCleaning] = useState<boolean>(false);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [productsRes, reservationsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/reservations"),
      ]);

      if (!productsRes.ok || !reservationsRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const productsData = await productsRes.json();
      const reservationsData = await reservationsRes.json();

      setProducts(productsData);
      setReservations(reservationsData);
    } catch (error) {
      console.error(error);
      toast.error("Database Connection Check: Make sure your DATABASE_URL in .env is configured and migrations are run.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(true);
    toast.success("Dashboard data refreshed!");
  };

  const handlePurge = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch("/api/cleanup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        if (data.cleaned && data.cleaned.length > 0) {
          toast.success(`Purged successfully! Released stock for ${data.cleaned.length} expired reservations.`);
        } else {
          toast.info("No expired reservations found to clean up.");
        }
        loadData(true);
      } else {
        throw new Error(data.message || "Failed to purge");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to trigger cleanup routine");
    } finally {
      setIsCleaning(false);
    }
  };

  const handleOpenBooking = (product: Product, inventory: Product["inventories"][0]) => {
    setBookingProduct(product);
    setBookingInventory(inventory);
    const available = inventory.totalUnits - inventory.reservedUnits;
    setReserveQuantity(Math.min(available, 5).toString());
  };

  const handleCloseBooking = () => {
    setBookingProduct(null);
    setBookingInventory(null);
    setIsBookingSubmitting(false);
  };

  const submitReservation = async () => {
    if (!bookingProduct || !bookingInventory) return;
    const qty = parseInt(reserveQuantity);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive integer quantity.");
      return;
    }

    const available = bookingInventory.totalUnits - bookingInventory.reservedUnits;
    if (qty > available) {
      toast.error(`Cannot reserve more than the available stock (${available} units).`);
      return;
    }

    setIsBookingSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: bookingProduct.id,
          warehouseId: bookingInventory.warehouseId,
          quantity: qty,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Reserved ${qty} units of "${bookingProduct.name}"! Expires in 5 minutes.`);
        handleCloseBooking();
        loadData(true);
      } else {
        if (res.status === 409) {
          toast.error("Overselling Blocked: Insufficient warehouse stock available.");
        } else {
          toast.error(data.message || "Failed to create reservation.");
        }
      }
    } catch (error) {
      toast.error("Error creating reservation. Make sure your database is connected.");
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const handleConfirmReservation = async (id: string) => {
    setLoadingConfirm((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Reservation confirmed! Stock successfully allocated and finalized.");
        loadData(true);
      } else {
        if (res.status === 410) {
          toast.error("This reservation has expired and the stock has already been released.");
        } else {
          toast.error(data.message || "Failed to confirm reservation.");
        }
        loadData(true);
      }
    } catch (error) {
      toast.error("Error confirming reservation.");
    } finally {
      setLoadingConfirm((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleReleaseReservation = async (id: string) => {
    setLoadingRelease((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}/release`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Reservation released! Held stock returned to inventory.");
        loadData(true);
      } else {
        toast.error(data.message || "Failed to release reservation.");
      }
    } catch (error) {
      toast.error("Error releasing reservation.");
    } finally {
      setLoadingRelease((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 font-sans">
      <Navbar />

      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">System Control Panel</h1>
            <p className="text-sm text-slate-400 mt-1">
              Simulate and monitor inventory allocations, concurrency safety, and stock holds in real time.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 font-medium"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Sync Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePurge}
              disabled={isCleaning}
              className="border-amber-900/30 bg-amber-950/10 text-amber-400 hover:bg-amber-950/30"
            >
              {isCleaning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-amber-400" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4 text-amber-500" />
              )}
              Trigger Purge
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400 font-medium">Checking database connections and loading inventory records...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                  <Database className="h-4.5 w-4.5 text-indigo-400" />
                  Product Catalog & Stock Allocations
                </h2>
                <Badge variant="outline" className="border-slate-800 text-slate-400">
                  {products.length} Products Available
                </Badge>
              </div>

              {products.length === 0 ? (
                <Card className="bg-slate-900/50 border-slate-900 text-center py-10">
                  <CardHeader>
                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <CardTitle className="text-slate-200">No Database Data Found</CardTitle>
                    <CardDescription className="text-slate-400 max-w-md mx-auto text-xs sm:text-sm">
                      Please run the seed script to populate products and warehouses in your database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-xs text-slate-500 font-mono">npx prisma db seed</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {products.map((product) => (
                    <Card key={product.id} className="bg-slate-900 border-slate-850 hover:border-slate-800 transition-colors shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-bold text-slate-100">{product.name}</CardTitle>
                            <CardDescription className="text-slate-400 text-xs font-mono mt-0.5">
                              SKU: {product.sku}
                            </CardDescription>
                          </div>
                          <span className="text-base font-bold text-indigo-400">
                            ${product.price.toFixed(2)}
                          </span>
                        </div>
                        {product.description && (
                          <p className="text-xs text-slate-400 mt-2 italic leading-relaxed">
                            {product.description}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        <div className="border-t border-slate-800/80 pt-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                            Warehouse Stock Levels
                          </h4>
                          <div className="grid gap-2">
                            {product.inventories.map((inventory) => {
                              const available = inventory.totalUnits - inventory.reservedUnits;
                              const isOutOfStock = available <= 0;
                              const isLowStock = available > 0 && available <= 10;

                              return (
                                <div
                                  key={inventory.id}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-900 hover:border-slate-800 transition-all gap-3"
                                >
                                  <div>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-200">
                                      {inventory.warehouse.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Location: {inventory.warehouse.location}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-4">
                                    <div className="flex gap-3 text-right">
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">Total</span>
                                        <span className="text-xs font-medium text-slate-300">{inventory.totalUnits}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">Held</span>
                                        <span className="text-xs font-medium text-amber-500">{inventory.reservedUnits}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold text-slate-500">Avail</span>
                                        <Badge
                                          variant="outline"
                                          className={`text-xs mt-0.5 py-0 px-1.5 ${
                                            isOutOfStock
                                              ? "bg-red-950/20 border-red-900/30 text-red-400"
                                              : isLowStock
                                              ? "bg-amber-950/20 border-amber-900/30 text-amber-400"
                                              : "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                                          }`}
                                        >
                                          {available} units
                                        </Badge>
                                      </div>
                                    </div>

                                    <Button
                                      size="sm"
                                      disabled={isOutOfStock}
                                      onClick={() => handleOpenBooking(product, inventory)}
                                      className={`h-8 font-medium ${
                                        isOutOfStock
                                          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                                      }`}
                                    >
                                      <Plus className="mr-1 h-3.5 w-3.5" />
                                      Reserve
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-6">
              <h2 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                <CalendarDays className="h-4.5 w-4.5 text-indigo-400" />
                Active Reservations Tracker
              </h2>

              {reservations.length === 0 ? (
                <Card className="bg-slate-900 border-slate-900 text-center py-12">
                  <CardHeader>
                    <Clock className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <CardTitle className="text-slate-300">No Reservations Yet</CardTitle>
                    <CardDescription className="text-slate-400 text-xs sm:text-sm max-w-xs mx-auto">
                      Click the "Reserve" button on any product to put a safe 5-minute stock hold.
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reservations.map((res) => {
                    const isPending = res.status === "PENDING";
                    const isConfirmed = res.status === "CONFIRMED";
                    const isReleased = res.status === "RELEASED";

                    return (
                      <Card key={res.id} className="bg-slate-900 border-slate-850 shadow-sm relative overflow-hidden">
                        {isPending && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                        )}
                        {isConfirmed && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                        )}
                        {isReleased && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-slate-700" />
                        )}

                        <CardContent className="p-4 sm:p-5 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-sm sm:text-base text-slate-100">{res.product.name}</h3>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">
                                Order ID: {res.id.slice(0, 8)}...
                              </p>
                            </div>
                            <Badge
                              className={`text-[10px] uppercase font-bold py-0.5 ${
                                isPending
                                  ? "bg-amber-950/30 border border-amber-900/50 text-amber-400"
                                  : isConfirmed
                                  ? "bg-emerald-950/30 border border-emerald-900/50 text-emerald-400"
                                  : "bg-slate-800 border border-slate-750 text-slate-400"
                              }`}
                            >
                              {res.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-900">
                            <div>
                              <span className="block text-[10px] text-slate-500 font-bold uppercase">Warehouse</span>
                              <span className="font-medium text-slate-300">{res.warehouse.name}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-500 font-bold uppercase">Held Units</span>
                              <span className="font-semibold text-slate-100">{res.quantity} items</span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
                            <div className="text-xs">
                              {isPending ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Timer:</span>
                                  <CountdownTimer
                                    expiresAt={res.expiresAt}
                                    onExpire={() => {
                                      startTransition(() => {
                                        setReservations((prev) =>
                                          prev.map((r) =>
                                            r.id === res.id ? { ...r, status: ReservationStatus.RELEASED } : r
                                          )
                                        );
                                      });
                                    }}
                                  />
                                </div>
                              ) : isConfirmed ? (
                                <span className="text-slate-500 text-xs">Finalized Stock Deduction</span>
                              ) : (
                                <span className="text-slate-500 text-xs">Released/Returned Hold</span>
                              )}
                            </div>

                            {isPending && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={loadingRelease[res.id]}
                                  onClick={() => handleReleaseReservation(res.id)}
                                  className="h-8 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-red-400"
                                >
                                  {loadingRelease[res.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <X className="h-3.5 w-3.5" />
                                  )}
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={loadingConfirm[res.id]}
                                  onClick={() => handleConfirmReservation(res.id)}
                                  className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  {loadingConfirm[res.id] ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                  Confirm
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Dialog open={bookingProduct !== null} onOpenChange={(open) => !open && handleCloseBooking()}>
        {bookingProduct && bookingInventory && (
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-50 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-white">Create Inventory Hold</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Reserving stock places a safe 5-minute atomic lock. The units will be held until confirmed or released.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="text-xs bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-1 font-mono">
                <p><span className="text-slate-500 font-bold">Product:</span> {bookingProduct.name}</p>
                <p><span className="text-slate-500 font-bold">Warehouse:</span> {bookingInventory.warehouse.name}</p>
                <p>
                  <span className="text-slate-500 font-bold">Available:</span>{" "}
                  <span className="text-emerald-400 font-semibold">
                    {bookingInventory.totalUnits - bookingInventory.reservedUnits} units
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Quantity to Reserve</label>
                <Input
                  type="number"
                  min="1"
                  max={bookingInventory.totalUnits - bookingInventory.reservedUnits}
                  value={reserveQuantity}
                  onChange={(e) => setReserveQuantity(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-white placeholder-slate-600 focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                disabled={isBookingSubmitting}
                onClick={handleCloseBooking}
                className="border-slate-800 text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                disabled={isBookingSubmitting}
                onClick={submitReservation}
                className="bg-indigo-600 text-white hover:bg-indigo-700"
              >
                {isBookingSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                ) : null}
                Hold Stock
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
