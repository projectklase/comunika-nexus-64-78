import { useState, useEffect, useCallback } from 'react';
import { Post, PostFilter } from '@/types/post';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { useAuth } from '@/contexts/AuthContext';

// NOVO: Hook refatorado para usar Supabase, com Realtime e função de invalidação
export function usePosts(filter?: PostFilter) {
  const { currentSchool } = useSchool();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // MUDANÇA: A lógica de busca agora está em uma função que podemos chamar quando quisermos
  const fetchPosts = useCallback(async () => {
    // 🔒 GUARD DEFENSIVO: Bloquear se não tiver escola definida
    if (!currentSchool?.id) {
      console.error('[usePosts] ⚠️ Tentativa de buscar posts sem currentSchool definido!');
      setPosts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = (supabase as any)
        .from('posts')
        .select('*')
        .eq('school_id', currentSchool.id)  // ✅ FILTRO CRÍTICO
        .not('school_id', 'is', null);  // ✅ Dupla garantia: rejeitar NULL

      // Aplica os filtros na consulta do Supabase (muito mais eficiente)
      if (filter) {
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        if (filter.type) {
          // Se o tipo for uma string com vírgulas, trata como um array
          const types = filter.type.split(',').map(t => t.trim());
          query = query.in('type', types);
        }
        // Adicione outros filtros aqui conforme necessário
      }

      // Ordena os resultados pelos mais recentes
      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // 🔒 VALIDAÇÃO DE SEGURANÇA: Verificar se todos os posts são da escola correta
      if (!data) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const invalidPosts = data.filter(p => p.school_id !== currentSchool.id);
      if (invalidPosts.length > 0) {
        console.error('[usePosts] 🚨 VAZAMENTO DETECTADO! Posts de outras escolas:', {
          currentSchool: currentSchool.id,
          currentSchoolName: currentSchool.name,
          invalidPosts: invalidPosts.map(p => ({
            id: p.id,
            title: p.title,
            school_id: p.school_id,
            type: p.type
          })),
          userRole: user?.role,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
        // TODO: Enviar alerta para sistema de monitoramento
      }

      // Filtrar apenas posts da escola correta (camada extra de segurança)
      const validData = data.filter(p => p.school_id === currentSchool.id);

      // Mapeia os dados de snake_case (do banco) para camelCase (do seu app)
      const formattedData = validData.map(p => ({
        id: p.id,
        title: p.title,
        body: p.body,
        type: p.type,
        status: p.status,
        audience: p.audience,
        authorId: p.author_id,
        authorName: p.author_name,
        authorRole: p.author_role,
        classId: p.class_id,
        classIds: p.class_ids || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        publishedAt: p.publish_at,
        dueAt: p.due_at,
        eventStartAt: p.event_start_at,
        eventEndAt: p.event_end_at,
        activityMeta: p.activity_meta,
        attachments: (p.attachments || []) as any,
        meta: p.meta,
        allowInvitations: p.allow_invitations, // Adicionado o campo allowInvitations
        allow_attachments: p.allow_attachments ?? false,
      })) as Post[];

      setPosts(formattedData);

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentSchool?.id, JSON.stringify(filter)]); // Refaz a busca se os filtros mudarem

  // Efeito para a busca inicial
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // NOVO: Efeito para a atualização em tempo real (substitui o setInterval)
  useEffect(() => {
    const channel = supabase
      .channel('realtime-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        (payload) => {
          console.log('Mudança nos posts recebida do Supabase!', payload);
          // Quando algo muda na tabela 'posts', simplesmente buscamos os dados de novo
          fetchPosts(); 
        }
      )
      .subscribe();

    // Função de limpeza para remover a inscrição quando o componente desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);


  // MUDANÇA: O hook agora retorna o status de loading, erros e a função de invalidação!
  return { posts, isLoading, error, invalidate: fetchPosts };
}