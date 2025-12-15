import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CardEvent, CardEventFormData } from '@/types/card-events';
import { toast } from 'sonner';

export function useCardEvents() {
  const queryClient = useQueryClient();

  // Fetch all events (for super admin)
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['card-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_events')
        .select('*')
        .order('starts_at', { ascending: false });
      
      if (error) throw error;
      return data as CardEvent[];
    }
  });

  // Fetch active event only
  const { data: activeEvent } = useQuery({
    queryKey: ['active-card-event'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('card_events')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as CardEvent | null;
    }
  });

  // Fetch cards for a specific event
  const fetchEventCards = async (eventId: string) => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('event_id', eventId)
      .order('rarity', { ascending: false });
    
    if (error) throw error;
    return data;
  };

  // Create event mutation
  const createEvent = useMutation({
    mutationFn: async (eventData: CardEventFormData) => {
      const { data, error } = await supabase
        .from('card_events')
        .insert(eventData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-card-event'] });
      toast.success('Evento criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar evento: ${error.message}`);
    }
  });

  // Update event mutation
  const updateEvent = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CardEventFormData> }) => {
      const { data: result, error } = await supabase
        .from('card_events')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-card-event'] });
      toast.success('Evento atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar evento: ${error.message}`);
    }
  });

  // Delete event mutation
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      // First, unlink any cards from this event
      await supabase
        .from('cards')
        .update({ event_id: null })
        .eq('event_id', eventId);
      
      // Then delete the event
      const { error } = await supabase
        .from('card_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-card-event'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success('Evento excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir evento: ${error.message}`);
    }
  });

  // Assign card to event
  const assignCardToEvent = useMutation({
    mutationFn: async ({ cardId, eventId }: { cardId: string; eventId: string | null }) => {
      const { error } = await supabase
        .from('cards')
        .update({ event_id: eventId })
        .eq('id', cardId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast.success('Carta vinculada ao evento!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao vincular carta: ${error.message}`);
    }
  });

  // Toggle event active status
  const toggleEventActive = useMutation({
    mutationFn: async ({ eventId, isActive }: { eventId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('card_events')
        .update({ is_active: isActive })
        .eq('id', eventId);
      
      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['card-events'] });
      queryClient.invalidateQueries({ queryKey: ['active-card-event'] });
      toast.success(isActive ? 'Evento ativado!' : 'Evento desativado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar status: ${error.message}`);
    }
  });

  return {
    events,
    eventsLoading,
    activeEvent,
    fetchEventCards,
    createEvent,
    updateEvent,
    deleteEvent,
    assignCardToEvent,
    toggleEventActive
  };
}
