"use client";

import { useEffect, useState, startTransition } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { CountdownTimer } from "@/components/reservations/countdown-timer";
import { ArrowLeft, Clock, Check, X, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ReservationStatus } from "@prisma/client";

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

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingConfirm, setLoadingConfirm] = useState<Record<string, boolean>>({});
  const [loadingRelease, setLoadingRelease] = useState<Record<string, boolean>>({});

  const fetchReservations = async () => {
    try {
      const res = await fetch("/api/reservations");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReservations(data);
    } catch {
      toast.error("Failed to load reservations database tables.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleConfirm = async (id: string) => {
    setLoadingConfirm((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        toast.success("Reservation confirmed! Held inventory successfully decremented.");
        fetchReservations();
      } else {
        if (res.status === 410) {
          toast.error("This hold has expired and cannot be confirmed.");
        } else {
          toast.error(data.message || "Failed to confirm reservation.");
        }
        fetchReservations();
      }
    } catch {
      toast.error("Network error during confirmation.");
    } finally {
      setLoadingConfirm((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRelease = async (id: string) => {
    setLoadingRelease((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
      const data = await res.json();

      if (res.ok) {
        toast.success("Reservation released! Held stock returned to available inventory.");
        fetchReservations();
      } else {
        toast.error(data.message || "Failed to release reservation.");
      }
    } catch {
      toast.error("Network error during release.");
    } finally {
      setLoadingRelease((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 p-2 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Active Reservations</h1>
            <p className="text-xs text-slate-400">Manage real-time pending holds and inventory commits</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-400">Loading reservations...</p>
          </div>
        ) : reservations.length === 0 ? (
          <Card className="bg-slate-900 border-slate-900 text-center py-16">
            <Clock className="h-10 w-10 text-slate-700 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-350 text-slate-350 font-semibold text-slate-200">
              No Reservations Yet
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
              Go to the main dashboard to create a pending hold.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {reservations.map((res) => {
              const isPending = res.status === "PENDING";
              const isConfirmed = res.status === "CONFIRMED";

              return (
                <Card key={res.id} className="bg-slate-900 border-slate-850 shadow-sm relative overflow-hidden">
                  {isPending && <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />}
                  {isConfirmed && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}
                  {!isPending && !isConfirmed && <div className="absolute top-0 left-0 w-1 h-full bg-slate-700" />}

                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-100 text-sm sm:text-base">{res.product.name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {res.id}</p>
                      </div>
                      <Badge
                        className={
                          isPending
                            ? "bg-amber-950/30 text-amber-400 border border-amber-900/50"
                            : isConfirmed
                            ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/50"
                            : "bg-slate-800 text-slate-400 border border-slate-750"
                        }
                      >
                        {res.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3 rounded-lg border border-slate-900 font-medium">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Warehouse</span>
                        <span className="text-slate-300">{res.warehouse.name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Held Quantity</span>
                        <span className="text-slate-100">{res.quantity} items</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="text-xs">
                        {isPending ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Timer:</span>
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
                          <span className="text-slate-500 text-xs">Allocated permanently</span>
                        ) : (
                          <span className="text-slate-500 text-xs">Released / Canceled hold</span>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingRelease[res.id]}
                            onClick={() => handleRelease(res.id)}
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
                            onClick={() => handleConfirm(res.id)}
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
      </main>
    </div>
  );
}
