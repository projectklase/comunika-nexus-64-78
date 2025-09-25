import { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';

export interface CalendarError {
  code: string;
  message: string;
  action?: () => void;
}

export class CalendarErrorHandler {
  static handleNavigationError(error: unknown, navigate: NavigateFunction) {
    console.error('Navigation error:', error);
    
    toast.error('Erro de navegação', {
      description: 'Ocorreu um erro ao navegar. Redirecionando para a página principal.',
      action: {
        label: 'Ir para Dashboard',
        onClick: () => navigate('/dashboard')
      }
    });
  }

  static handleEventError(error: unknown, context: string) {
    console.error(`Calendar event error in ${context}:`, error);
    
    toast.error('Erro no evento', {
      description: 'Não foi possível processar este evento. Tente novamente.',
    });
  }

  static handleDrawerError(error: unknown) {
    console.error('Drawer error:', error);
    
    toast.error('Erro ao abrir detalhes', {
      description: 'Não foi possível abrir os detalhes. Tente novamente.',
    });
  }

  static handleDateError(error: unknown) {
    console.error('Date parsing error:', error);
    
    toast.error('Erro de data', {
      description: 'Data inválida fornecida. Usando data atual.',
    });
  }

  static handlePermissionError(userRole?: string) {
    toast.error('Acesso negado', {
      description: `Você não tem permissão para esta ação. Perfil atual: ${userRole || 'desconhecido'}`,
    });
  }
}