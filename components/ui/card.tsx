import { cn } from "@/lib/utils"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-6", className)}>
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardProps) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: CardProps) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className }: CardProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {children}
    </p>
  )
}

export function CardContent({ children, className }: CardProps) {
  return <div className={cn("", className)}>{children}</div>
}
