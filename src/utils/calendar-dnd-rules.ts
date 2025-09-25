import { format, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PostType } from '@/types/post';

export interface DndRuleResult {
  allowed: boolean;
  warning?: string;
  error?: string;
  shouldShowToast: boolean;
  toastMessage?: string;
  toastVariant?: 'default' | 'destructive' | 'warning';
}

export interface DndContext {
  postType: PostType;
  originalDate: Date;
  targetDate: Date;
  isActivity: boolean;
  isEvent: boolean;
}

export class CalendarDndRules {
  static validateDrop(context: DndContext): DndRuleResult {
    const { postType, originalDate, targetDate, isActivity, isEvent } = context;
    const today = startOfDay(new Date());
    const targetDay = startOfDay(targetDate);
    const isMovingToPast = isBefore(targetDay, today);
    
    // Rule 1: Activities/Trabalhos/Provas cannot be moved to past dates
    if (isActivity && isMovingToPast) {
      return {
        allowed: false,
        error: 'Não é possível definir prazo no passado',
        shouldShowToast: true,
        toastMessage: `Atividades não podem ter prazo no passado. Escolha uma data futura.`,
        toastVariant: 'destructive'
      };
    }

    // Rule 2: Events can be moved to past dates but with warning
    if (isEvent && isMovingToPast) {
      return {
        allowed: true,
        warning: 'Evento em data passada',
        shouldShowToast: true,
        toastMessage: `Evento movido para ${format(targetDate, "dd 'de' MMMM", { locale: ptBR })} (data passada).`,
        toastVariant: 'warning'
      };
    }

    // Rule 3: Moving to future dates is always allowed
    return {
      allowed: true,
      shouldShowToast: false
    };
  }

  static canDrop(postType: PostType, targetDate: Date): boolean {
    const context: DndContext = {
      postType,
      originalDate: new Date(), // Not needed for can-drop check
      targetDate,
      isActivity: ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postType),
      isEvent: ['EVENTO', 'AVISO', 'COMUNICADO'].includes(postType)
    };

    const result = this.validateDrop(context);
    return result.allowed;
  }

  static getDropFeedback(postType: PostType, targetDate: Date): {
    canDrop: boolean;
    message?: string;
    variant?: 'info' | 'warning' | 'error';
  } {
    const today = startOfDay(new Date());
    const targetDay = startOfDay(targetDate);
    const isMovingToPast = isBefore(targetDay, today);
    const isActivity = ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postType);
    const isEvent = ['EVENTO', 'AVISO', 'COMUNICADO'].includes(postType);

    if (isActivity && isMovingToPast) {
      return {
        canDrop: false,
        message: 'Prazos não podem ser no passado',
        variant: 'error'
      };
    }

    if (isEvent && isMovingToPast) {
      return {
        canDrop: true,
        message: 'Evento será marcado como passado',
        variant: 'warning'
      };
    }

    return {
      canDrop: true,
      message: `Mover para ${format(targetDate, "dd 'de' MMM", { locale: ptBR })}`,
      variant: 'info'
    };
  }
}

// Utility functions for specific post type checks
export const isDndAllowed = (postType: PostType, targetDate: Date): boolean => {
  return CalendarDndRules.canDrop(postType, targetDate);
};

export const getDndFeedback = (postType: PostType, targetDate: Date) => {
  return CalendarDndRules.getDropFeedback(postType, targetDate);
};

export const validateDndOperation = (
  postType: PostType,
  originalDate: Date,
  targetDate: Date
): DndRuleResult => {
  const context: DndContext = {
    postType,
    originalDate,
    targetDate,
    isActivity: ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(postType),
    isEvent: ['EVENTO', 'AVISO', 'COMUNICADO'].includes(postType)
  };

  return CalendarDndRules.validateDrop(context);
};