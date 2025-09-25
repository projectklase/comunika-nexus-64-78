import { useEffect, useCallback } from 'react';

interface KeyboardShortcutConfig {
  key: string;
  action: () => void;
  description: string;
  disabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts if user is typing in an input
    const target = event.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable ||
                          target.closest('[data-radix-select-content]') ||
                          target.closest('[role="combobox"]');

    if (isInputElement) return;

    // Check if any modifier keys are pressed
    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;

    const pressedKey = event.key.toLowerCase();
    
    const matchingShortcut = shortcuts.find(
      shortcut => shortcut.key.toLowerCase() === pressedKey && !shortcut.disabled
    );

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

export function useModalKeyboardShortcuts(
  isOpen: boolean,
  onClose: () => void,
  additionalShortcuts: KeyboardShortcutConfig[] = []
) {
  const modalShortcuts: KeyboardShortcutConfig[] = [
    {
      key: 'Escape',
      action: onClose,
      description: 'Fechar modal',
      disabled: !isOpen
    },
    ...additionalShortcuts.map(shortcut => ({
      ...shortcut,
      disabled: shortcut.disabled || !isOpen
    }))
  ];

  useKeyboardShortcuts(modalShortcuts);
}

export function useDayFocusShortcuts(
  isOpen: boolean,
  onNewPost: () => void,
  onEdit: () => void,
  onClose: () => void,
  hasSelectedItem: boolean = false
) {
  const shortcuts: KeyboardShortcutConfig[] = [
    {
      key: 'n',
      action: onNewPost,
      description: 'Novo Post (N)',
      disabled: !isOpen
    },
    {
      key: 'e',
      action: onEdit,
      description: 'Editar (E)',
      disabled: !isOpen || !hasSelectedItem
    },
    {
      key: 'Escape',
      action: onClose,
      description: 'Fechar (Esc)',
      disabled: !isOpen
    }
  ];

  useKeyboardShortcuts(shortcuts);

  return { shortcuts: shortcuts.filter(s => !s.disabled) };
}