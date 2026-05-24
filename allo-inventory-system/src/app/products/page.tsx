import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const revalidate = 0;

export default async function ProductsPage() {
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-slate-900 p-2 hover:bg-slate-800 text-slate-405 text-slate-400 hover:text-white transition-colors border border-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Stock Directory</h1>
            <p className="text-xs text-slate-400">Total units vs held holds breakdown</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="bg-slate-900 border-slate-850">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-100">{product.name}</CardTitle>
                    <CardDescription className="font-mono text-[10px] text-slate-500 mt-0.5">
                      SKU: {product.sku}
                    </CardDescription>
                  </div>
                  <span className="text-sm font-bold text-indigo-400">${product.price.toFixed(2)}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.description && (
                  <p className="text-xs text-slate-400 italic leading-relaxed">{product.description}</p>
                )}
                <div className="border-t border-slate-800/80 pt-3 space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Warehouse Stock Allocation
                  </h4>
                  {product.inventories.map((inventory) => {
                    const available = inventory.totalUnits - inventory.reservedUnits;
                    const isOutOfStock = available <= 0;

                    return (
                      <div
                        key={inventory.id}
                        className="flex justify-between items-center bg-slate-950/60 p-2 rounded border border-slate-900 text-xs gap-3"
                      >
                        <span className="text-slate-300 font-medium">{inventory.warehouse.name}</span>
                        <Badge
                          variant="outline"
                          className={
                            isOutOfStock
                              ? "border-red-900/30 text-red-400 bg-red-950/10 text-[10px]"
                              : "border-emerald-900/30 text-emerald-400 bg-emerald-950/10 text-[10px]"
                          }
                        >
                          {available} of {inventory.totalUnits} available
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
