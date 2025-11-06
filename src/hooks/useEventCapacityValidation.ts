import { supabase } from '@/integrations/supabase/client';

export interface CapacityCheckResult {
  canInvite: boolean;
  reason?: string;
  current?: number;
  max?: number;
  remaining?: number;
}

export function useEventCapacityValidation() {
  const checkInvitationLimits = async (
    eventId: string, 
    studentId: string
  ): Promise<CapacityCheckResult> => {
    try {
      // 1. Buscar configuração do evento
      const { data: event, error: eventError } = await supabase
        .from('posts')
        .select('event_capacity_enabled, event_capacity_type, event_max_participants, event_max_guests_per_student')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      if (!event?.event_capacity_enabled) {
        return { canInvite: true }; // Sem limite configurado
      }

      // 2. Limite POR ALUNO
      if (event.event_capacity_type === 'PER_STUDENT') {
        const { count, error: countError } = await supabase
          .from('event_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('inviting_student_id', studentId);

        if (countError) throw countError;

        const currentCount = count || 0;
        const maxAllowed = event.event_max_guests_per_student || 0;

        if (currentCount >= maxAllowed) {
          return {
            canInvite: false,
            reason: `Você já atingiu o limite de ${maxAllowed} convidado(s) para este evento`,
            current: currentCount,
            max: maxAllowed,
            remaining: 0
          };
        }

        return { 
          canInvite: true, 
          current: currentCount, 
          max: maxAllowed,
          remaining: maxAllowed - currentCount
        };
      }

      // 3. Limite GLOBAL
      if (event.event_capacity_type === 'GLOBAL') {
        // Contar confirmações
        const { count: confirmationsCount, error: confirmError } = await supabase
          .from('event_confirmations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);

        if (confirmError) throw confirmError;

        // Contar convites
        const { count: invitationsCount, error: inviteError } = await supabase
          .from('event_invitations')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId);

        if (inviteError) throw inviteError;

        const totalParticipants = (confirmationsCount || 0) + (invitationsCount || 0);
        const maxAllowed = event.event_max_participants || 0;

        if (totalParticipants >= maxAllowed) {
          return {
            canInvite: false,
            reason: `Evento lotado! Limite de ${maxAllowed} participantes atingido`,
            current: totalParticipants,
            max: maxAllowed,
            remaining: 0
          };
        }

        return { 
          canInvite: true, 
          current: totalParticipants, 
          max: maxAllowed,
          remaining: maxAllowed - totalParticipants
        };
      }

      return { canInvite: true };
    } catch (error) {
      console.error('Erro ao verificar limites de capacidade:', error);
      return { canInvite: true }; // Em caso de erro, permitir convite (fail-safe)
    }
  };

  return { checkInvitationLimits };
}
