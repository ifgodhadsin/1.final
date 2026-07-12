import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals)
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    on_trip: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    in_shop: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    retired: "bg-red-500/15 text-red-400 border-red-500/20",
    dispatched: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/20",
    low: "bg-emerald-500/15 text-emerald-400",
    medium: "bg-amber-500/15 text-amber-400",
    high: "bg-red-500/15 text-red-400",
    critical: "bg-red-500/25 text-red-400 border-red-500/30",
  }
  return colors[status] || "bg-slate-500/15 text-slate-400"
}
