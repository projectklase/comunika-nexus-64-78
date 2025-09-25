import {
  AppDialog,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from './AppDialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'warning';
  isAsync?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  variant = 'default',
  isAsync = false,
  loading = false
}: ConfirmDialogProps) {
  
  const handleConfirm = async () => {
    if (isAsync) {
      await onConfirm();
    } else {
      onConfirm();
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'destructive':
        return 'destructive';
      case 'warning':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <AppDialog open={open} onOpenChange={onOpenChange} modalId="confirm-dialog" priority={200}>
      <AppDialogContent className="sm:max-w-[425px]" preventClose={loading}>
        <AppDialogHeader>
          <AppDialogTitle className={variant === 'destructive' ? 'text-destructive' : ''}>
            {title}
          </AppDialogTitle>
          <AppDialogDescription>
            {description}
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Processando...' : confirmText}
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}