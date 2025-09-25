/**
 * AppDialog - Unified dialog component with professional behavior
 * 
 * Features:
 * - Closes on overlay click (with exceptions for portal interactions)
 * - ESC closes only the top-most modal
 * - Focus trap with return focus to trigger
 * - Scroll lock while open
 * - Z-index management via ModalManager
 * - Unsaved changes guard
 * - Full accessibility support
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useModalManager } from './ModalManager';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface AppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
  preventClose?: boolean;
  modalId?: string;
  priority?: number;
  className?: string;
}

const AppDialog = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Root>,
  AppDialogProps
>(({
  open,
  onOpenChange,
  children,
  closeOnOverlay = true,
  closeOnEsc = true,
  preventClose = false,
  modalId,
  priority = 100,
  className,
  ...props
}, ref) => {
  const id = modalId || React.useId();
  const { registerModal, unregisterModal, isTopModal, lockScroll, unlockScroll } = useModalManager();

  // Register modal when opened
  React.useEffect(() => {
    if (open) {
      registerModal(id, priority);
      lockScroll();
    } else {
      unregisterModal(id);
      unlockScroll();
    }

    return () => {
      if (open) {
        unregisterModal(id);
        unlockScroll();
      }
    };
  }, [open, id, priority, registerModal, unregisterModal, lockScroll, unlockScroll]);

  // Handle close with guard
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!newOpen && preventClose) {
      // Don't close if prevented
      return;
    }
    onOpenChange(newOpen);
  }, [onOpenChange, preventClose]);

  // Handle escape key - only close if top modal
  const handleEscapeKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (!closeOnEsc || !isTopModal(id)) {
      e.preventDefault();
      return;
    }
    if (preventClose) {
      e.preventDefault();
      return;
    }
  }, [closeOnEsc, isTopModal, id, preventClose]);

  // Handle overlay click with portal exceptions
  const handleInteractOutside = React.useCallback((e: Event) => {
    if (!closeOnOverlay || !isTopModal(id)) {
      e.preventDefault();
      return;
    }

    // Check if click is from a portal element (Select, DatePicker, Combobox, etc.)
    const target = e.target as HTMLElement;
    const isPortalInteraction = 
      target.closest('[data-radix-portal]') ||
      target.closest('[data-portal]') ||
      target.closest('[role="listbox"]') ||
      target.closest('[role="option"]') ||
      target.closest('[data-datepicker]') ||
      target.closest('[data-radix-popper-content-wrapper]') ||
      target.closest('[data-radix-menu-content]') ||
      target.closest('[data-radix-select-content]') ||
      target.closest('[data-radix-dropdown-menu-content]') ||
      target.closest('[data-radix-context-menu-content]') ||
      target.closest('[data-radix-hover-card-content]') ||
      target.closest('[data-radix-popover-content]') ||
      target.closest('[data-radix-tooltip-content]');

    if (isPortalInteraction) {
      e.preventDefault();
      return;
    }

    if (preventClose) {
      e.preventDefault();
      return;
    }
  }, [closeOnOverlay, isTopModal, id, preventClose]);

  return (
    <DialogPrimitive.Root 
      open={open} 
      onOpenChange={handleOpenChange}
      {...props}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay 
          className={cn(
            "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
          style={{ 
            pointerEvents: isTopModal(id) ? 'auto' : 'none',
            zIndex: 50 + priority 
          }}
        />
        <DialogPrimitive.Content
          ref={ref}
          onEscapeKeyDown={handleEscapeKeyDown}
          onInteractOutside={handleInteractOutside}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-lg",
            "translate-x-[-50%] translate-y-[-50%] overflow-auto",
            "glass-card border-border/50 p-6 shadow-lg duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
          style={{ 
            zIndex: 50 + priority + 1
          }}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});

AppDialog.displayName = 'AppDialog';

// Export sub-components for compatibility
const AppDialogTrigger = DialogPrimitive.Trigger;
const AppDialogPortal = DialogPrimitive.Portal;
const AppDialogClose = DialogPrimitive.Close;

const AppDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
AppDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const AppDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    closeOnOverlay?: boolean;
    closeOnEsc?: boolean;
    preventClose?: boolean;
  }
>(({ className, children, closeOnOverlay = true, closeOnEsc = true, preventClose = false, ...props }, ref) => {
  const modalId = React.useId();
  const { isTopModal } = useModalManager();
  const { containerRef } = useFocusTrap({
    isActive: true,
    onEscape: closeOnEsc && !preventClose ? () => {} : undefined
  });

  return (
    <DialogPrimitive.Portal>
      <AppDialogOverlay />
      <DialogPrimitive.Content
        ref={(node) => {
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          if (node) (containerRef as any).current = node;
        }}
        onInteractOutside={(e) => {
          if (!closeOnOverlay || !isTopModal(modalId) || preventClose) {
            e.preventDefault();
            return;
          }

          const target = e.target as HTMLElement;
          const isPortalInteraction = 
            target.closest('[data-radix-portal]') ||
            target.closest('[data-portal]') ||
            target.closest('[role="listbox"]') ||
            target.closest('[data-datepicker]');

          if (isPortalInteraction) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (!closeOnEsc || !isTopModal(modalId) || preventClose) {
            e.preventDefault();
          }
        }}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 max-h-[85vh] w-full max-w-lg",
          "translate-x-[-50%] translate-y-[-50%] overflow-auto",
          "glass-card border-border/50 p-6 shadow-lg duration-200",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
AppDialogContent.displayName = DialogPrimitive.Content.displayName;

const AppDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AppDialogHeader.displayName = "AppDialogHeader";

const AppDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AppDialogFooter.displayName = "AppDialogFooter";

const AppDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
AppDialogTitle.displayName = DialogPrimitive.Title.displayName;

const AppDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
AppDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  AppDialog,
  AppDialogPortal,
  AppDialogOverlay,
  AppDialogTrigger,
  AppDialogClose,
  AppDialogContent,
  AppDialogHeader,
  AppDialogFooter,
  AppDialogTitle,
  AppDialogDescription,
};