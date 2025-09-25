import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface DirtyPromptOptions {
  isDirty: boolean;
  onSaveAsDraft: () => void;
  onDiscard: () => void;
  onContinueEditing?: () => void;
}

interface ConfirmationResult {
  action: 'save' | 'discard' | 'continue';
}

export function useDirtyPrompt({
  isDirty,
  onSaveAsDraft,
  onDiscard,
  onContinueEditing
}: DirtyPromptOptions) {
  const { user } = useAuth();
  const isPrompting = useRef(false);

  // Create confirmation dialog
  const showConfirmation = useCallback((): Promise<ConfirmationResult> => {
    return new Promise((resolve) => {
      if (isPrompting.current) {
        resolve({ action: 'continue' });
        return;
      }

      isPrompting.current = true;

      // Create modal elements
      const overlay = document.createElement('div');
      overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4';
      
      const modal = document.createElement('div');
      modal.className = 'bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6 space-y-4';
      
      modal.innerHTML = `
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-card-foreground">Salvar como rascunho?</h3>
          <p class="text-sm text-muted-foreground">Você tem alterações não publicadas. O que deseja fazer?</p>
        </div>
        
        <div class="flex flex-col-reverse sm:flex-row gap-2 pt-4">
          <button id="discard-btn" class="flex-1 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent transition-colors">
            Descartar
          </button>
          <button id="continue-btn" class="flex-1 px-4 py-2 text-sm font-medium text-foreground border border-border rounded-md hover:bg-accent transition-colors">
            Continuar Editando
          </button>
          <button id="save-btn" class="flex-1 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Salvar como Rascunho
          </button>
        </div>
      `;

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Handle button clicks
      const saveBtn = modal.querySelector('#save-btn');
      const discardBtn = modal.querySelector('#discard-btn');
      const continueBtn = modal.querySelector('#continue-btn');

      const cleanup = () => {
        document.body.removeChild(overlay);
        isPrompting.current = false;
      };

      saveBtn?.addEventListener('click', () => {
        cleanup();
        resolve({ action: 'save' });
      });

      discardBtn?.addEventListener('click', () => {
        cleanup();
        resolve({ action: 'discard' });
      });

      continueBtn?.addEventListener('click', () => {
        cleanup();
        resolve({ action: 'continue' });
      });

      // Handle ESC key and overlay click
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve({ action: 'continue' });
          document.removeEventListener('keydown', handleEscape);
        }
      };

      document.addEventListener('keydown', handleEscape);
      
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve({ action: 'continue' });
        }
      });
    });
  }, []);

  // Function to be called when attempting to close
  const promptBeforeClose = useCallback(async (): Promise<boolean> => {
    if (!isDirty || !user) {
      return true; // Allow close
    }

    const result = await showConfirmation();
    
    switch (result.action) {
      case 'save':
        onSaveAsDraft();
        return true; // Allow close after saving
      case 'discard':
        onDiscard();
        return true; // Allow close after discarding
      case 'continue':
      default:
        onContinueEditing?.();
        return false; // Prevent close
    }
  }, [isDirty, user, showConfirmation, onSaveAsDraft, onDiscard, onContinueEditing]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!user) return;

      // Ctrl/Cmd + S = Save draft
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSaveAsDraft();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [user, onSaveAsDraft]);

  return {
    promptBeforeClose,
    showConfirmation
  };
}