import { ActivityType, Post } from '@/types/post';
import { FileText, FolderOpen, ClipboardCheck } from 'lucide-react';

export const ACTIVITY_CONFIG = {
  ATIVIDADE: {
    label: 'Atividade',
    icon: FileText,
    color: {
      primary: 'blue',
      bg: 'bg-blue-500/10',
      text: 'text-blue-600',
      border: 'border-blue-500/20',
      badge: 'bg-blue-500',
      hover: 'hover:bg-blue-500/20'
    }
  },
  TRABALHO: {
    label: 'Trabalho',
    icon: FolderOpen,
    color: {
      primary: 'orange',
      bg: 'bg-orange-500/10',
      text: 'text-orange-600',
      border: 'border-orange-500/20',
      badge: 'bg-orange-500',
      hover: 'hover:bg-orange-500/20'
    }
  },
  PROVA: {
    label: 'Prova',
    icon: ClipboardCheck,
    color: {
      primary: 'red',
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      border: 'border-red-500/20',
      badge: 'bg-red-500',
      hover: 'hover:bg-red-500/20'
    }
  }
} as const;

export function getActivityConfig(type: ActivityType) {
  return ACTIVITY_CONFIG[type];
}

export function isActivityPost(post: Post): boolean {
  return ['ATIVIDADE', 'TRABALHO', 'PROVA'].includes(post.type);
}

export function getActivityTypeFromPost(post: Post): ActivityType | null {
  if (isActivityPost(post)) {
    return post.type as ActivityType;
  }
  return null;
}

export function getDefaultActivityMeta(type: ActivityType) {
  switch (type) {
    case 'ATIVIDADE':
      return { peso: 1, usePeso: true };
    case 'TRABALHO':
      return { peso: 2, permitirGrupo: false, usePeso: true };
    case 'PROVA':
      return { peso: 3, duracao: 50, tipoProva: 'DISCURSIVA' as const, bloquearAnexosAluno: false, usePeso: true };
    default:
      return {};
  }
}