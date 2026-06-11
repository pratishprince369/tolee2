import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-shimmer rounded-md bg-zinc-200/80 dark:bg-zinc-800/80", className)}
      {...props}
    />
  )
}

export { Skeleton }
