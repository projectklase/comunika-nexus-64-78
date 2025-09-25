import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-success text-success-foreground hover:bg-success/80",
        compact:
          "border-transparent bg-muted text-muted-foreground px-2 py-0.5 text-xs",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
      responsive: {
        true: "max-w-[8rem] sm:max-w-[12rem] md:max-w-none truncate",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      responsive: false,
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  truncate?: boolean
}

function Badge({ className, variant, size, responsive, truncate = true, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size, responsive }), className)} {...props}>
      {truncate && typeof children === 'string' ? (
        <span className="truncate text-ellipsis overflow-hidden min-w-0">
          {children}
        </span>
      ) : (
        children
      )}
    </div>
  )
}

export { Badge, badgeVariants }
