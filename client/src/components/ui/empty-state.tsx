import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  className?: string
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  className,
  title = "No data to display",
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="mb-6 text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 80"
          className="h-20 w-30"
          fill="none"
        >
          <rect
            x="10"
            y="8"
            width="100"
            height="64"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
            className="opacity-40"
          />
          <rect
            x="20"
            y="32"
            width="16"
            height="32"
            rx="2"
            fill="currentColor"
            className="opacity-30"
          />
          <rect
            x="42"
            y="24"
            width="16"
            height="40"
            rx="2"
            fill="currentColor"
            className="opacity-50"
          />
          <rect
            x="64"
            y="16"
            width="16"
            height="48"
            rx="2"
            fill="currentColor"
            className="opacity-40"
          />
          <circle
            cx="94"
            cy="56"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M94 52v8M88 56h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className="mb-2 text-lg font-semibold text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}