import * as React from "react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showHeader?: boolean
  mode?: 'auto' | 'modal' | 'sheet'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-none w-[var(--tablet-modal-width)] max-h-[var(--tablet-modal-height)]'
}

export function ResponsiveModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className,
  size = 'lg',
  showHeader = true,
  mode = 'auto'
}: ResponsiveModalProps) {
  const isMobile = useIsMobile()
  const shouldUseSheet = mode === 'sheet' || (mode === 'auto' && isMobile)

  if (shouldUseSheet) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent 
          side="bottom" 
          className={cn(
            "h-[var(--mobile-sheet-height)] flex flex-col",
            "rounded-t-xl border-t border-border/50",
            className
          )}
        >
          {showHeader && title && (
            <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 pb-4">
              <SheetTitle className="text-[var(--mobile-title-size)] font-semibold">
                {title}
              </SheetTitle>
            </SheetHeader>
          )}
          <div className="flex-1 overflow-y-auto p-[var(--mobile-padding)]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={cn(
          "glass-card border border-border/50",
          "w-[var(--tablet-modal-width)] h-[var(--tablet-modal-height)]",
          "max-w-[var(--max-modal-width)] max-h-screen",
          "flex flex-col overflow-hidden",
          sizeClasses[size],
          className
        )}
      >
        {showHeader && title && (
          <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/30 pb-4">
            <DialogTitle className="text-[var(--tablet-title-size)] font-semibold">
              {title}
            </DialogTitle>
          </DialogHeader>
        )}
        <div className="flex-1 overflow-y-auto p-[var(--tablet-padding)]">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Collapsible content component for long descriptions
interface CollapsibleContentProps {
  children: React.ReactNode
  maxLines?: number
  expandText?: string
  collapseText?: string
}

export function CollapsibleContent({ 
  children, 
  maxLines = 6, 
  expandText = "Ver mais",
  collapseText = "Ver menos" 
}: CollapsibleContentProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  
  return (
    <div className="space-y-2">
      <div 
        className={cn(
          "transition-all duration-300",
          !isExpanded && `line-clamp-${maxLines}`
        )}
      >
        {children}
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-primary hover:text-primary-glow text-sm font-medium transition-colors"
      >
        {isExpanded ? collapseText : expandText}
      </button>
    </div>
  )
}

// Responsive grid component
interface ResponsiveGridProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveGrid({ children, className }: ResponsiveGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-[var(--mobile-grid-cols)]",
      "md:grid-cols-[var(--tablet-grid-cols)]", 
      "lg:grid-cols-[var(--desktop-grid-cols)]",
      className
    )}>
      {children}
    </div>
  )
}

// Sticky footer for actions
interface StickyFooterProps {
  children: React.ReactNode
  className?: string
}

export function StickyFooter({ children, className }: StickyFooterProps) {
  return (
    <div className={cn(
      "sticky bottom-0 z-10",
      "bg-background/95 backdrop-blur-sm",
      "border-t border-border/30",
      "p-[var(--mobile-padding)] md:p-[var(--tablet-padding)]",
      "h-[var(--sticky-footer-height)]",
      "flex items-center justify-end gap-3",
      className
    )}>
      {children}
    </div>
  )
}