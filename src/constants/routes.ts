export const ROUTES = {
  ALUNO: {
    CALENDARIO: '/aluno/calendario',
    FEED: '/aluno/feed',
    DASHBOARD: '/aluno/dashboard',
    NEXUS: '/aluno/nexus'
  },
  PROFESSOR: {
    CALENDARIO: '/professor/calendario',
    CLASSES: '/professor/turmas',
    ACTIVITIES: '/professor/atividades',
    DASHBOARD: '/professor/dashboard',
    FEED: '/professor/atividades' // Professor activities as feed equivalent
  },
  SECRETARIA: {
    CALENDARIO: '/secretaria/calendario',
    CLASSES: '/secretaria/turmas',
    DASHBOARD: '/dashboard',
    FEED: '/secretaria/feed',
    HISTORICO: '/secretaria/historico',
    NOVO_POST: '/novo-post',
    NOTIFICACOES: '/secretaria/notificacoes',
    SEGURANCA: {
      RESETS: '/secretaria/seguranca/resets'
    },
    CADASTROS: {
      CATALOGO: '/secretaria/cadastros/catalogo',
      PROGRAMAS: '/secretaria/cadastros/programas',
      ALUNOS: '/secretaria/cadastros/alunos',
      PROFESSORES: '/secretaria/cadastros/professores',
      // MODELOS_TURMA removed - redirects to PROGRAMAS
    }
  }
} as const;

export type RouteKeys = typeof ROUTES;