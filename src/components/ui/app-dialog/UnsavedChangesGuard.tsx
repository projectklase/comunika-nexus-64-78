import { useState, useEffect } from 'react';
import { ConfirmDialog } from './ConfirmDialog';

interface UnsavedChangesGuardProps {
  isDirty: boolean;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  saveText?: string;
  discardText?: string;
  cancelText?: string;
}

export function useUnsavedChangesGuard({
  isDirty,
  onSave,
  onDiscard,
  onCancel,
  title = 'Alterações não salvas',
  description = 'Você tem alterações não salvas. O que deseja fazer?',
  saveText = 'Salvar',
  discardText = 'Descartar',
  cancelText = 'Continuar editando'
}: UnsavedChangesGuardProps) {
  const [showGuard, setShowGuard] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Function to request close with guard check
  const requestClose = (action: () => void) => {
    if (isDirty) {
      setPendingAction(() => action);
      setShowGuard(true);
      return false; // Prevent immediate close
    }
    action();
    return true; // Allow immediate close
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
    setShowGuard(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    }
    setShowGuard(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    setShowGuard(false);
    setPendingAction(null);
  };

  // Browser back/refresh warning
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const GuardDialog = () => (
    <ConfirmDialog
      open={showGuard}
      onOpenChange={setShowGuard}
      title={title}
      description={description}
      confirmText={saveText}
      cancelText={discardText}
      onConfirm={handleSave}
      onCancel={handleCancel}
      variant="warning"
      isAsync={true}
    />
  );

  return {
    requestClose,
    showGuard,
    GuardDialog
  };
}