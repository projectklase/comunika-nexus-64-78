import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        compact: "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
        success: "bg-success text-success-foreground hover:bg-success/90",
      },
      size: {
        xs: "h-8 px-2.5 text-xs min-w-[2rem] max-w-[8rem]",
        sm: "h-9 px-3 text-sm min-w-[2.25rem] max-w-[10rem]",
        default: "h-10 px-4 text-sm min-w-[2.5rem] max-w-[12rem]",
        lg: "h-11 px-6 text-base min-w-[2.75rem] max-w-[14rem]",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-xs": "h-6 w-6 p-0",
      },
      responsive: {
        true: "sm:max-w-none lg:px-6",
        false: "",
      },
      overflow: {
        hidden: "overflow-hidden",
        visible: "overflow-visible",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      responsive: false,
      overflow: "hidden",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  truncate?: boolean
  overflow?: 'hidden' | 'visible'
}

export interface ResponsiveButtonProps extends ButtonProps {
  shortLabel?: string
  iconOnly?: boolean
  tooltip?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, truncate = true, overflow, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, overflow, className }))}
        ref={ref}
        {...props}
      >
        {truncate && typeof children === 'string' ? (
          <span className="truncate text-ellipsis overflow-hidden min-w-0">
            {children}
          </span>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
