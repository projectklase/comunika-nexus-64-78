import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/post';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface EventConfirmationManagerProps {
  event: Post;
  studentId: string;
  onConfirmationChange?: () => void;
}

export function EventConfirmationManager({ 
  event, 
  studentId, 
  onConfirmationChange 
}: EventConfirmationManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    checkConfirmation();
  }, [event.id, studentId]);

  const checkConfirmation = async () => {
    setIsCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('event_confirmations')
        .select('id')
        .eq('event_id', event.id)
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (error) throw error;
      setIsConfirmed(!!data);
    } catch (error: any) {
      console.error('Erro ao verificar confirmação:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleToggleConfirmation = async () => {
    setIsLoading(true);
    try {
      if (isConfirmed) {
        // Remover confirmação
        const { error } = await supabase
          .from('event_confirmations')
          .delete()
          .eq('event_id', event.id)
          .eq('student_id', studentId);
        
        if (error) throw error;
        
        setIsConfirmed(false);
        toast({ 
          title: 'Presença cancelada', 
          description: 'Você pode confirmar novamente a qualquer momento.'
        });
      } else {
        // Adicionar confirmação
        const { error } = await supabase
          .from('event_confirmations')
          .insert({
            event_id: event.id,
            student_id: studentId
          });
        
        if (error) throw error;
        
        setIsConfirmed(true);
        toast({ 
          title: '✅ Presença confirmada!', 
          description: 'Você está confirmado para este evento.' 
        });
        
        // ✅ Invalidar queries de desafios para atualizar UI
        queryClient.invalidateQueries({ queryKey: ['student_challenges'] });
      }
      
      onConfirmationChange?.();
    } catch (error: any) {
      console.error('Erro ao confirmar presença:', error);
      toast({ 
        title: 'Erro ao confirmar presença', 
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <div className="p-4 rounded-lg bg-muted/50 animate-pulse">
        <div className="h-12 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div 
      className={`p-4 rounded-lg border-2 transition-all ${
        isConfirmed 
          ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/10 border-green-500/40' 
          : 'bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border-blue-500/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`p-2 rounded-full ring-2 flex-shrink-0 ${
            isConfirmed
              ? 'bg-green-500/30 ring-green-400/50'
              : 'bg-blue-500/30 ring-blue-400/50'
          }`}
        >
          {isConfirmed ? (
            <CheckCircle className="h-5 w-5 text-green-200" />
          ) : (
            <CheckCircle className="h-5 w-5 text-blue-200" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-sm ${isConfirmed ? 'text-green-100' : 'text-blue-100'}`}>
            {isConfirmed ? '✅ Presença Confirmada' : 'Confirmar Presença'}
          </h4>
          <p className={`text-xs ${isConfirmed ? 'text-green-100/90' : 'text-blue-100/90'}`}>
            {isConfirmed 
              ? 'Você confirmou presença neste evento'
              : 'Confirme sua presença para o evento'
            }
          </p>
        </div>
        
        <Button
          onClick={handleToggleConfirmation}
          disabled={isLoading}
          variant={isConfirmed ? 'outline' : 'default'}
          size="sm"
          className={
            isConfirmed 
              ? 'border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md'
          }
        >
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {!isLoading && isConfirmed && <XCircle className="h-4 w-4 mr-1" />}
          {!isLoading && !isConfirmed && <CheckCircle className="h-4 w-4 mr-1" />}
          {isConfirmed ? 'Cancelar' : 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}
