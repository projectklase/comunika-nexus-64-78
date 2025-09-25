import { ConfirmDialog as AppConfirmDialog } from '@/components/ui/app-dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  variant = 'default'
}: ConfirmDialogProps) {
  return (
    <AppConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText="Cancelar"
      onConfirm={onConfirm}
      variant={variant === 'destructive' ? 'destructive' : 'default'}
    />
  );
}