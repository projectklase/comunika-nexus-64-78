import { PostgrestError } from '@supabase/supabase-js';

export interface ErrorDetails {
  title: string;
  message: string;
  action?: string;
  technical?: string;
}

/**
 * Mapeia erros do Supabase para mensagens amigáveis ao usuário
 */
export function getSupabaseErrorMessage(error: PostgrestError | Error | unknown): ErrorDetails {
  // Erro genérico
  if (error instanceof Error && !('code' in error)) {
    return {
      title: 'Erro inesperado',
      message: 'Ocorreu um erro ao processar sua solicitação.',
      action: 'Tente novamente em alguns instantes.',
      technical: error.message
    };
  }

  const pgError = error as PostgrestError;
  const code = pgError.code;

  // Erros de autenticação
  if (code === 'PGRST301') {
    return {
      title: 'Sessão expirada',
      message: 'Sua sessão expirou por inatividade.',
      action: 'Por favor, faça login novamente.',
      technical: pgError.message
    };
  }

  // Erros de permissão (RLS)
  if (code === '42501' || pgError.message?.includes('permission denied')) {
    return {
      title: 'Acesso negado',
      message: 'Você não tem permissão para realizar esta ação.',
      action: 'Verifique suas permissões ou contate o administrador.',
      technical: pgError.message
    };
  }

  // Erros de violação de constraint
  if (code === '23505') {
    return {
      title: 'Registro duplicado',
      message: 'Já existe um registro com estas informações.',
      action: 'Verifique os dados e tente novamente com valores únicos.',
      technical: pgError.message
    };
  }

  if (code === '23503') {
    return {
      title: 'Registro relacionado não encontrado',
      message: 'Não foi possível completar a ação devido a dependências.',
      action: 'Verifique se todos os registros necessários existem.',
      technical: pgError.message
    };
  }

  if (code === '23514') {
    return {
      title: 'Dados inválidos',
      message: 'Os dados fornecidos não atendem aos requisitos.',
      action: 'Revise os campos e tente novamente.',
      technical: pgError.message
    };
  }

  // Erros de conexão/rede
  if (code === 'PGRST000' || pgError.message?.includes('network')) {
    return {
      title: 'Erro de conexão',
      message: 'Não foi possível conectar ao servidor.',
      action: 'Verifique sua conexão com a internet e tente novamente.',
      technical: pgError.message
    };
  }

  // Erro de timeout
  if (pgError.message?.includes('timeout')) {
    return {
      title: 'Tempo esgotado',
      message: 'A operação demorou muito tempo para responder.',
      action: 'Tente novamente. Se o problema persistir, contate o suporte.',
      technical: pgError.message
    };
  }

  // Erro padrão
  return {
    title: 'Erro na operação',
    message: 'Ocorreu um erro ao processar sua solicitação.',
    action: 'Tente novamente. Se o problema persistir, contate o suporte.',
    technical: pgError.message || 'Erro desconhecido'
  };
}

/**
 * Erros específicos de autenticação
 */
export function getAuthErrorMessage(errorCode: string): ErrorDetails {
  const errorMap: Record<string, ErrorDetails> = {
    'invalid_credentials': {
      title: 'Credenciais inválidas',
      message: 'Email ou senha incorretos.',
      action: 'Verifique suas credenciais e tente novamente.'
    },
    'user_not_found': {
      title: 'Usuário não encontrado',
      message: 'Não existe conta cadastrada com este email.',
      action: 'Verifique o email ou solicite um novo cadastro.'
    },
    'email_not_confirmed': {
      title: 'Email não confirmado',
      message: 'Você precisa confirmar seu email antes de fazer login.',
      action: 'Verifique sua caixa de entrada e confirme seu email.'
    },
    'weak_password': {
      title: 'Senha fraca',
      message: 'A senha não atende aos requisitos de segurança.',
      action: 'Use pelo menos 8 caracteres com letras e números.'
    },
    'rate_limit_exceeded': {
      title: 'Muitas tentativas',
      message: 'Você excedeu o número de tentativas permitidas.',
      action: 'Aguarde alguns minutos antes de tentar novamente.'
    },
    'network_error': {
      title: 'Erro de conexão',
      message: 'Não foi possível conectar ao servidor.',
      action: 'Verifique sua internet e tente novamente.'
    }
  };

  return errorMap[errorCode] || {
    title: 'Erro de autenticação',
    message: 'Ocorreu um erro ao tentar fazer login.',
    action: 'Tente novamente em alguns instantes.',
    technical: errorCode
  };
}

/**
 * Erros de validação de formulário
 */
export function getValidationErrorMessage(field: string, rule: string): string {
  const messages: Record<string, Record<string, string>> = {
    email: {
      required: 'Email é obrigatório',
      invalid: 'Email inválido'
    },
    password: {
      required: 'Senha é obrigatória',
      min: 'Senha deve ter no mínimo 8 caracteres',
      weak: 'Senha muito fraca'
    },
    name: {
      required: 'Nome é obrigatório',
      min: 'Nome deve ter no mínimo 3 caracteres'
    },
    phone: {
      required: 'Telefone é obrigatório',
      invalid: 'Telefone inválido'
    },
    date: {
      required: 'Data é obrigatória',
      invalid: 'Data inválida',
      past: 'Data não pode ser no passado'
    }
  };

  return messages[field]?.[rule] || `Campo ${field} inválido: ${rule}`;
}
