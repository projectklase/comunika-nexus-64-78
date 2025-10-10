import { Post, PostInput, PostFilter, PostStatus, PostType, PostAudience } from '@/types/post';
import { validatePostData } from '@/lib/data-hygiene';
import { logAudit } from '@/stores/audit-store';
import { generateDiff } from '@/utils/audit-helpers';
import { generatePostNotifications } from '@/utils/notification-generator';
import { supabase } from '@/integrations/supabase/client';

class PostStore {
  private autoPublishInterval: NodeJS.Timeout | null = null;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.processScheduledPosts();
    this.startAutoPublishTimer();
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

  private dbRowToPost(row: any): Post {
    return {
      id: row.id,
      type: row.type as PostType,
      title: row.title,
      body: row.body,
      attachments: row.attachments,
      classId: row.class_id,
      classIds: row.class_ids,
      dueAt: row.due_at,
      eventStartAt: row.event_start_at,
      eventEndAt: row.event_end_at,
      eventLocation: row.event_location,
      audience: row.audience as PostAudience,
      authorName: row.author_name,
      authorId: row.author_id,
      authorRole: row.author_role as 'secretaria' | 'professor' | 'aluno',
      createdAt: row.created_at,
      status: row.status as PostStatus,
      publishAt: row.publish_at,
      activityMeta: row.activity_meta,
      meta: row.meta
    };
  }

  async list(filter?: PostFilter, page?: number, pageSize?: number): Promise<Post[]> {
    // Legacy support: if pagination params not provided, return all
    if (page === undefined) {
      const result = await this.listPaginated(filter, 1, 999);
      return result.posts;
    }
    const result = await this.listPaginated(filter, page, pageSize || 20);
    return result.posts;
  }

  async listPaginated(filter?: PostFilter, page = 1, pageSize = 20): Promise<{ posts: Post[]; total: number }> {
    try {
      let query = supabase.from('posts').select('*', { count: 'exact' });

      // Exclude SCHEDULED posts by default unless specifically filtering for them
      if (!filter?.status || filter.status !== 'SCHEDULED') {
        query = query.neq('status', 'SCHEDULED');
      }

      // Filter by type
      if (filter?.type) {
        query = query.eq('type', filter.type);
      }

      // Filter by status
      if (filter?.status) {
        query = query.eq('status', filter.status);
      }

      // Filter by classId
      if (filter?.classId) {
        query = query.eq('audience', 'CLASS').contains('class_ids', [filter.classId]);
      }

      // Filter by authorRole
      if (filter?.authorRole) {
        query = query.eq('author_role', filter.authorRole);
      }

      // Filter by query
      if (filter?.query) {
        query = query.or(`title.ilike.%${filter.query}%,body.ilike.%${filter.query}%`);
      }

      // Sort by created_at descending
      query = query.order('created_at', { ascending: false });

      // Pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, error, count } = await query;

      if (error) {
        console.error('[PostStore] Error loading posts:', error);
        throw new Error('Não foi possível carregar os posts. Tente novamente.');
      }

      return {
        posts: data ? data.map(row => this.dbRowToPost(row)) : [],
        total: count || 0
      };
    } catch (error) {
      console.error('[PostStore] Error loading posts:', error);
      throw error;
    }
  }

  async create(input: PostInput, authorName: string, authorId: string, allowPastOverride = false): Promise<Post> {
    // Validate and sanitize data
    const validation = validatePostData(input, allowPastOverride);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const insertData = {
      type: validation.data.type,
      title: validation.data.title,
      body: validation.data.body,
      attachments: validation.data.attachments,
      class_id: validation.data.classId,
      class_ids: validation.data.classIds,
      due_at: validation.data.dueAt,
      event_start_at: validation.data.eventStartAt,
      event_end_at: validation.data.eventEndAt,
      event_location: validation.data.eventLocation,
      audience: validation.data.audience,
      author_name: authorName,
      author_id: authorId,
      author_role: this.inferAuthorRole(authorName),
      status: validation.data.status || 'PUBLISHED',
      publish_at: validation.data.publishAt,
      activity_meta: validation.data.activityMeta,
      meta: validation.data.meta
    };

    const { data, error } = await supabase
      .from('posts')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('[PostStore] Error creating post:', error);
      if (error.code === '23505') {
        throw new Error('Já existe um post com essas características.');
      }
      if (error.code === '42501') {
        throw new Error('Você não tem permissão para criar posts.');
      }
      throw new Error('Não foi possível criar o post. Verifique os dados e tente novamente.');
    }

    const post = this.dbRowToPost(data);
    this.notifySubscribers();
    
    // Generate notifications (async, don't block)
    generatePostNotifications(post, 'created').catch(error => {
      console.error('Error generating notifications:', error);
    });
    
    // Log audit event
    try {
      logAudit({
        action: 'CREATE',
        entity: 'POST',
        entity_id: post.id,
        entity_label: post.title,
        scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
        class_name: post.audience === 'CLASS' && post.classIds?.length ? await this.getClassNameFromId(post.classIds[0]) : undefined,
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
        actor_id: authorId,
        actor_name: authorName,
        actor_email: 'user@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return post;
  }

  async update(id: string, patch: Partial<PostInput>, allowPastOverride = false): Promise<Post | null> {
    // Get current post
    const { data: currentData, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentData) {
      console.error('Error fetching post for update:', fetchError);
      return null;
    }

    const currentPost = this.dbRowToPost(currentData);
    const mergedData = { ...currentPost, ...patch };
    
    // Validate and sanitize data
    const validation = validatePostData(mergedData, allowPastOverride);
    if (!validation.isValid) {
      throw new Error(`Dados inválidos: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    const updateData = {
      type: validation.data.type,
      title: validation.data.title,
      body: validation.data.body,
      attachments: validation.data.attachments,
      class_id: validation.data.classId,
      class_ids: validation.data.classIds,
      due_at: validation.data.dueAt,
      event_start_at: validation.data.eventStartAt,
      event_end_at: validation.data.eventEndAt,
      event_location: validation.data.eventLocation,
      audience: validation.data.audience,
      status: validation.data.status,
      publish_at: validation.data.publishAt,
      activity_meta: validation.data.activityMeta,
      meta: validation.data.meta
    };

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating post:', error);
      throw new Error('Erro ao atualizar post');
    }

    const afterPost = this.dbRowToPost(data);
    this.notifySubscribers();
    
    // Generate notifications for updates (async, don't block)
    const hasSignificantChange = 
      currentPost.status !== afterPost.status ||
      currentPost.dueAt !== afterPost.dueAt ||
      currentPost.title !== afterPost.title;
    
    if (hasSignificantChange) {
      const action = currentPost.dueAt !== afterPost.dueAt ? 'deadline_changed' : 'updated';
      generatePostNotifications(afterPost, action, currentPost).catch(error => {
        console.error('Error generating notifications:', error);
      });
    }
    
    // Log audit event
    try {
      const changedFields = Object.keys(patch);
      const diff = generateDiff(currentPost, afterPost);
      
      logAudit({
        action: 'UPDATE',
        entity: 'POST',
        entity_id: id,
        entity_label: afterPost.title,
        scope: afterPost.audience === 'CLASS' && afterPost.classIds?.length ? `CLASS:${afterPost.classIds[0]}` : 'GLOBAL',
        class_name: afterPost.audience === 'CLASS' && afterPost.classIds?.length ? await this.getClassNameFromId(afterPost.classIds[0]) : undefined,
        meta: {
          fields: changedFields,
          post_type: afterPost.type,
          subtype: afterPost.type,
          status_before: currentPost.status,
          status_after: afterPost.status
        },
        diff_json: diff,
        actor_id: afterPost.authorId || 'user-secretaria',
        actor_name: afterPost.authorName,
        actor_email: 'user@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return afterPost;
  }

  async archive(id: string): Promise<boolean> {
    const { data: postData, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !postData) {
      console.error('Error fetching post for archive:', fetchError);
      return false;
    }

    const post = this.dbRowToPost(postData);
    const beforeStatus = post.status;

    const { error } = await supabase
      .from('posts')
      .update({ status: 'ARCHIVED' })
      .eq('id', id);

    if (error) {
      console.error('Error archiving post:', error);
      return false;
    }

    this.notifySubscribers();
    
    // Log audit event
    try {
      logAudit({
        action: 'ARCHIVE',
        entity: 'POST',
        entity_id: id,
        entity_label: post.title,
        scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
        class_name: post.audience === 'CLASS' && post.classIds?.length ? await this.getClassNameFromId(post.classIds[0]) : undefined,
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
        actor_id: post.authorId || 'user-secretaria',
        actor_name: post.authorName,
        actor_email: 'user@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return true;
  }

  async getById(id: string): Promise<Post | null> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.dbRowToPost(data);
    } catch (error) {
      console.error('Error getting post by id:', error);
      return null;
    }
  }

  private async processScheduledPosts() {
    const now = new Date().toISOString();
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ status: 'PUBLISHED' })
        .eq('status', 'SCHEDULED')
        .lte('publish_at', now)
        .select();

      if (error) {
        console.error('Error processing scheduled posts:', error);
        return;
      }

      if (data && data.length > 0) {
        this.notifySubscribers();
        
        // Generate notifications for newly published scheduled posts
        data.forEach(postData => {
          const post = this.dbRowToPost(postData);
          generatePostNotifications(post, 'created').catch(error => {
            console.error('Error generating notifications for scheduled post:', error);
          });
        });
      }
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
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

  async duplicate(id: string): Promise<PostInput | null> {
    const post = await this.getById(id);
    if (!post) return null;

    return {
      type: post.type,
      title: `Cópia - ${post.title}`,
      body: post.body,
      attachments: post.attachments ? [...post.attachments] : undefined,
      classId: post.classId,
      classIds: post.classIds || (post.classId ? [post.classId] : undefined),
      dueAt: post.dueAt,
      eventStartAt: post.eventStartAt,
      eventEndAt: post.eventEndAt,
      eventLocation: post.eventLocation,
      audience: post.audience,
      activityMeta: post.activityMeta ? { ...post.activityMeta } : undefined
    };
  }

  async delete(id: string): Promise<boolean> {
    const { data: postData, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !postData) {
      console.error('Error fetching post for delete:', fetchError);
      return false;
    }

    const post = this.dbRowToPost(postData);

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
      return false;
    }

    this.notifySubscribers();
    
    // Log audit event
    try {
      logAudit({
        action: 'DELETE',
        entity: 'POST',
        entity_id: id,
        entity_label: post.title,
        scope: post.audience === 'CLASS' && post.classIds?.length ? `CLASS:${post.classIds[0]}` : 'GLOBAL',
        class_name: post.audience === 'CLASS' && post.classIds?.length ? await this.getClassNameFromId(post.classIds[0]) : undefined,
        meta: {
          fields: ['deleted'],
          post_type: post.type,
          subtype: post.type,
          status_before: post.status
        },
        diff_json: {
          deleted: { before: false, after: true }
        },
        actor_id: post.authorId || 'user-secretaria',
        actor_name: post.authorName,
        actor_email: 'user@escola.com',
        actor_role: 'SECRETARIA'
      });
    } catch (error) {
      console.error('Erro ao registrar evento de auditoria:', error);
    }
    
    return true;
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

  // Helper method to get class name from ID
  private async getClassNameFromId(classId: string): Promise<string | undefined> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single();

      if (error || !data) {
        return undefined;
      }

      return data.name;
    } catch (error) {
      console.error('Error getting class name:', error);
      return undefined;
    }
  }
}

export const postStore = new PostStore();