import { cn } from "@/lib/utils"
import { getStatusColor } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  status?: string
  className?: string
}

export function Badge({ children, status, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        status ? getStatusColor(status) : "bg-primary/15 text-primary",
        className
      )}
    >
      {children}
    </span>
  )
}
