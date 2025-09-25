import { Post, PostInput, PostFilter, PostStatus, PostType, PostAudience } from '@/types/post';
import { validatePostData } from '@/lib/data-hygiene';
import { logAudit } from '@/stores/audit-store';
import { generateDiff } from '@/utils/audit-helpers';
import { generatePostNotifications } from '@/utils/notification-generator';

class PostStore {
  private posts: Post[] = [];
  private storageKey = 'comunika_posts';
  private autoPublishInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.initializeWithMockData();
    this.processScheduledPosts();
    this.startAutoPublishTimer();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.posts = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading posts from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.posts));
      this.notifySubscribers();
    } catch (error) {
      console.error('Error saving posts to storage:', error);
    }
  }
  
  private notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in post store subscriber:', error);
      }
    });
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  list(filter?: PostFilter): Post[] {
    let filteredPosts = [...this.posts];

    // Exclude SCHEDULED posts by default unless specifically filtering for them
    if (!filter?.status || filter.status !== 'SCHEDULED') {
      filteredPosts = filteredPosts.filter(post => post.status !== 'SCHEDULED');
    }

    // Include all valid post types when no type filter is specified
    if (filter?.type) {
      filteredPosts = filteredPosts.filter(post => post.type === filter.type);
    } else {
      // When no type filter, include all valid post types (ensure AVISO and COMUNICADO are visible)
      const validTypes: PostType[] = ['AVISO', 'COMUNICADO', 'EVENTO', 'ATIVIDADE', 'TRABALHO', 'PROVA'];
      filteredPosts = filteredPosts.filter(post => validTypes.includes(post.type));
    }

    if (filter?.status) {
      filteredPosts = filteredPosts.filter(post => post.status === filter.status);
    }

    if (filter?.classId) {
      filteredPosts = filteredPosts.filter(post => {
        // Support both new classIds array and legacy classId
        const postClasses = post.classIds || (post.classId ? [post.classId] : []);
        return post.audience === 'CLASS' && postClasses.includes(filter.classId!);
      });
    }

    if (filter?.authorRole) {
      filteredPosts = filteredPosts.filter(post => {
        // Infer authorRole from authorName if not explicitly set
        const authorRole = post.authorRole || this.inferAuthorRole(post.authorName);
        return authorRole === filter.authorRole;
      });
    }

    if (filter?.query) {
      const query = filter.query.toLowerCase();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.body?.toLowerCase().includes(query)
      );
    }

    // Sort by createdAt descending (most recent first)
    return filteredPosts.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  create(input: PostInput, authorName: string, allowPastOverride = false): Post {
    // Validate and sanitize data
    const validation = validatePostData(input, allowPastOverride);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const post: Post = {
      id: this.generateId(),
      ...validation.data,
      authorName,
      createdAt: new Date().toISOString(),
      status: validation.data.status || 'PUBLISHED',
      publishAt: validation.data.publishAt
    };

    this.posts.unshift(post);
    this.saveToStorage();
    
    // Generate notifications
    try {
      generatePostNotifications(post, 'created');
    } catch (error) {
      console.error('Error generating notifications:', error);
    }
    
    // Log audit event
    try {
      logAudit({
        action: 'CREATE',
        entity: 'POST',
        entity_id: post.id,
        entity_label: post.title,
        scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
        class_name: post.audience === 'CLASS' && post.classIds?.length ? this.getClassNameFromId(post.classIds[0]) : undefined,
        meta: {
          fields: ['title', 'type', 'status', 'audience'],
          post_type: post.type,
          subtype: post.type,
          status_after: post.status
        },
        diff_json: {
          title: { before: null, after: post.title },
          type: { before: null, after: post.type },
          status: { before: null, after: post.status },
          audience: { before: null, after: post.audience }
        },
        actor_id: 'user-secretaria', // TODO: Get from auth context
        actor_name: authorName,
        actor_email: 'secretaria@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return post;
  }

  update(id: string, patch: Partial<PostInput>, allowPastOverride = false): Post | null {
    const index = this.posts.findIndex(post => post.id === id);
    if (index === -1) return null;

    const currentPost = this.posts[index];
    const mergedData = { ...currentPost, ...patch };
    
    // Validate and sanitize data
    const validation = validatePostData(mergedData, allowPastOverride);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const beforePost = { ...currentPost };
    this.posts[index] = { ...currentPost, ...validation.data };
    const afterPost = this.posts[index];
    
    this.saveToStorage();
    
    // Log audit event
    try {
      const changedFields = Object.keys(patch);
      const diff = generateDiff(beforePost, afterPost);
      
      logAudit({
        action: 'UPDATE',
        entity: 'POST',
        entity_id: id,
        entity_label: afterPost.title,
        scope: afterPost.audience === 'CLASS' && afterPost.classIds?.length ? `CLASS:${afterPost.classIds[0]}` : 'GLOBAL',
        class_name: afterPost.audience === 'CLASS' && afterPost.classIds?.length ? this.getClassNameFromId(afterPost.classIds[0]) : undefined,
        meta: {
          fields: changedFields,
          post_type: afterPost.type,
          subtype: afterPost.type,
          status_before: beforePost.status,
          status_after: afterPost.status
        },
        diff_json: diff,
        actor_id: 'user-secretaria', // TODO: Get from auth context
        actor_name: beforePost.authorName,
        actor_email: 'secretaria@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return this.posts[index];
  }

  archive(id: string): boolean {
    const post = this.posts.find(p => p.id === id);
    if (!post) return false;

    const beforeStatus = post.status;
    post.status = 'ARCHIVED';
    this.saveToStorage();
    
    // Log audit event
    try {
      logAudit({
        action: 'ARCHIVE',
        entity: 'POST',
        entity_id: id,
        entity_label: post.title,
        scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
        class_name: post.audience === 'CLASS' && post.classIds?.length ? this.getClassNameFromId(post.classIds[0]) : undefined,
        meta: {
          fields: ['status'],
          post_type: post.type,
          subtype: post.type,
          status_before: beforeStatus,
          status_after: 'ARCHIVED'
        },
        diff_json: {
          status: { before: beforeStatus, after: 'ARCHIVED' }
        },
        actor_id: 'user-secretaria', // TODO: Get from auth context
        actor_name: post.authorName,
        actor_email: 'secretaria@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return true;
  }

  getById(id: string): Post | null {
    return this.posts.find(post => post.id === id) || null;
  }

  private processScheduledPosts() {
    const now = new Date();
    let updated = false;
    
    this.posts.forEach(post => {
      if (post.status === 'SCHEDULED' && post.publishAt) {
        const publishTime = new Date(post.publishAt);
        if (publishTime <= now) {
          post.status = 'PUBLISHED';
          updated = true;
        }
      }
    });
    
    if (updated) {
      this.saveToStorage();
    }
  }

  private startAutoPublishTimer() {
    if (this.autoPublishInterval) {
      clearInterval(this.autoPublishInterval);
    }
    
    // Check every minute for posts to auto-publish
    this.autoPublishInterval = setInterval(() => {
      this.processScheduledPosts();
    }, 60000);
  }

  destroy() {
    if (this.autoPublishInterval) {
      clearInterval(this.autoPublishInterval);
      this.autoPublishInterval = null;
    }
  }

  duplicate(id: string): PostInput | null {
    const post = this.getById(id);
    if (!post) return null;

    return {
      type: post.type,
      title: `Cópia - ${post.title}`,
      body: post.body,
      attachments: post.attachments ? [...post.attachments] : undefined,
      classId: post.classId,  // legacy support
      classIds: post.classIds || (post.classId ? [post.classId] : undefined),
      dueAt: post.dueAt,
      eventStartAt: post.eventStartAt,
      eventEndAt: post.eventEndAt,
      eventLocation: post.eventLocation,
      audience: post.audience,
      activityMeta: post.activityMeta ? { ...post.activityMeta } : undefined
    };
  }

  delete(id: string): boolean {
    const post = this.posts.find(p => p.id === id);
    if (!post) return false;
    
    const initialLength = this.posts.length;
    this.posts = this.posts.filter(p => p.id !== id);
    const success = this.posts.length < initialLength;
    
    if (success) {
      this.saveToStorage();
      
      // Log audit event
      try {
        logAudit({
          action: 'DELETE',
          entity: 'POST',
          entity_id: id,
          entity_label: post.title,
          scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
          class_name: post.audience === 'CLASS' && post.classIds?.length ? this.getClassNameFromId(post.classIds[0]) : undefined,
          meta: {
            fields: ['deleted'],
            post_type: post.type,
            subtype: post.type,
            status_before: post.status
          },
          diff_json: {
            deleted: { before: false, after: true }
          },
          actor_id: 'user-secretaria', // TODO: Get from auth context
          actor_name: post.authorName,
          actor_email: 'secretaria@escola.com',
          actor_role: 'SECRETARIA'
        });
      } catch (error) {
        console.error('Erro ao registrar evento de auditoria:', error);
      }
    }
    
    return success;
  }

  private initializeWithMockData() {
    // Only add mock data if no posts exist
    if (this.posts.length === 0) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const mockPosts: Post[] = [
        {
          id: 'evento-1',
          type: 'EVENTO' as PostType,
          title: 'Reunião de Pais - 1º Bimestre',
          body: 'Reunião para apresentação das notas e discussão do desenvolvimento dos alunos.',
          eventStartAt: tomorrow.toISOString(),
          eventEndAt: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
          eventLocation: 'Auditório Principal',
          audience: 'GLOBAL' as PostAudience,
          authorName: 'Secretaria Central',
          authorRole: 'secretaria' as const,
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          status: 'PUBLISHED' as PostStatus
        },
        {
          id: 'evento-2',
          type: 'EVENTO' as PostType,
          title: 'Feira de Ciências 2024',
          body: 'Apresentação dos projetos científicos desenvolvidos pelos alunos durante o semestre.',
          eventStartAt: nextWeek.toISOString(),
          eventEndAt: new Date(nextWeek.getTime() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours later
          eventLocation: 'Pátio Central',
          audience: 'GLOBAL' as PostAudience,
          authorName: 'Coordenação Pedagógica',
          authorRole: 'secretaria' as const,
          createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          status: 'PUBLISHED' as PostStatus
        },
        {
          id: 'atividade-1',
          type: 'ATIVIDADE' as PostType,
          title: 'Relatório de Física - Movimento Retilíneo',
          body: 'Elaborar relatório completo sobre experimentos de movimento retilíneo realizados em laboratório.',
          dueAt: new Date(tomorrow.getTime() + 18 * 60 * 60 * 1000).toISOString(), // Tomorrow at 6 PM
          classIds: ['class-3a'],  // Migrated from classId
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. João Santos',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
          status: 'PUBLISHED' as PostStatus,
          activityMeta: { peso: 1, rubrica: 'Avaliação baseada na precisão dos dados coletados e qualidade da análise.' }
        },
        {
          id: 'trabalho-1',
          type: 'TRABALHO' as PostType,
          title: 'Redação - Impactos Ambientais',
          body: 'Redação dissertativa sobre impactos ambientais. Mínimo 25 linhas.',
          dueAt: new Date(nextWeek.getTime() + 14 * 60 * 60 * 1000).toISOString(), // Next week at 2 PM
          classIds: ['class-3a'],  // Migrated from classId
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. Ana Oliveira',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
          status: 'PUBLISHED' as PostStatus,
          activityMeta: { peso: 2, formatosEntrega: ['PDF'], permitirGrupo: false }
        },
        {
          id: 'prova-1',
          type: 'PROVA' as PostType,
          title: 'Prova de Matemática - Funções',
          body: 'Avaliação sobre funções quadráticas e exponenciais.',
          dueAt: new Date(nextWeek.getTime() + 8 * 60 * 60 * 1000).toISOString(), // Next week at 8 AM
          classIds: ['class-3a'],
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. Carlos Silva',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          status: 'PUBLISHED' as PostStatus,
          activityMeta: { peso: 3, duracao: 90, local: 'Sala 101', tipoProva: 'MISTA', bloquearAnexosAluno: true }
        },
        {
          id: 'aviso-1',
          type: 'AVISO' as PostType,
          title: 'Mudança no Horário das Aulas',
          body: 'As aulas de segunda-feira iniciarão 30 minutos mais tarde devido a manutenção.',
          audience: 'GLOBAL' as PostAudience,
          authorName: 'Secretaria Central',
          authorRole: 'secretaria' as const,
          createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          status: 'PUBLISHED' as PostStatus
        },
        {
          id: 'atividade-6a',
          type: 'ATIVIDADE' as PostType,
          title: 'Lista de Exercícios - Matemática',
          body: 'Lista de exercícios sobre equações do primeiro grau. Resolver todos os exercícios no caderno.',
          dueAt: new Date(tomorrow.getTime() + 20 * 60 * 60 * 1000).toISOString(), // Tomorrow at 8 PM
          classIds: ['class-6a'],
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. Maria Santos',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          status: 'PUBLISHED' as PostStatus,
          activityMeta: { peso: 1.5, rubrica: 'Todos os exercícios devem estar resolvidos com cálculos detalhados.' }
        },
        {
          id: 'comunicado-6a',
          type: 'COMUNICADO' as PostType,
          title: 'Material Necessário - Aula de Ciências',
          body: 'Para a próxima aula de ciências, tragam: jaleco, óculos de proteção e caderno de laboratório.',
          classIds: ['class-6a'],
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. Carlos Oliveira',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          status: 'PUBLISHED' as PostStatus
        },
        {
          id: 'trabalho-atrasado',
          type: 'TRABALHO' as PostType,
          title: 'Pesquisa sobre Estados Brasileiros',
          body: 'Pesquisa completa sobre um estado brasileiro de sua escolha. Mínimo 10 páginas.',
          dueAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago (OVERDUE)
          classIds: ['class-6a'],
          audience: 'CLASS' as PostAudience,
          authorName: 'Prof. Ana Geografia',
          authorRole: 'professor' as const,
          createdAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
          status: 'PUBLISHED' as PostStatus,
          activityMeta: { peso: 2.5, formatosEntrega: ['PDF', 'APRESENTACAO'], permitirGrupo: true }
        }
      ];

      this.posts = mockPosts;
      this.saveToStorage();
    }
  }
  
  // Helper method to infer author role from author name
  private inferAuthorRole(authorName: string): 'secretaria' | 'professor' | 'aluno' {
    if (authorName.toLowerCase().includes('secretaria')) {
      return 'secretaria';
    }
    if (authorName.toLowerCase().includes('prof') || authorName.toLowerCase().includes('coordenação')) {
      return 'professor';
    }
    return 'aluno';
  }

  // Helper method to get class name from ID (placeholder)
  private getClassNameFromId(classId: string): string | undefined {
    // TODO: Integrate with ClassStore to get actual class name
    const classMap: Record<string, string> = {
      'class-3a': '3º Ano A',
      'class-6a': '6º Ano A',
      // Add more mappings as needed
    };
    return classMap[classId];
  }
}

export const postStore = new PostStore();