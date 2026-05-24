import { Layers, ShieldCheck } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-indigo-500" />
          <span className="text-lg font-bold tracking-tight text-white">Allo Inventory</span>
          <span className="hidden rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 sm:block">
            Vercel-Ready
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Postgres Row Locked (SELECT FOR UPDATE)</span>
          </div>
        </div>
      </div>
    </header>
  );
}
