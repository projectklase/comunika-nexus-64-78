import { useState, useEffect, useCallback } from 'react';
import { Post, PostFilter } from '@/types/post';
import { supabase } from '@/integrations/supabase/client'; // Garantindo que estamos usando o caminho correto

// NOVO: Hook refatorado para usar Supabase, com Realtime e função de invalidação
export function usePosts(filter?: PostFilter) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  // MUDANÇA: A lógica de busca agora está em uma função que podemos chamar quando quisermos
  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('posts').select('*');

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

      // Mapeia os dados de snake_case (do banco) para camelCase (do seu app)
      const formattedData = data.map(p => ({
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
      })) as Post[];

      setPosts(formattedData);

    } catch (err) {
      console.error('Error fetching posts:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [JSON.stringify(filter)]); // Refaz a busca se os filtros mudarem

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