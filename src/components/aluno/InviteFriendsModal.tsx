import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/post';
import { Users, Loader2 } from 'lucide-react';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Post;
  studentId: string;
}

const inviteSchema = z.object({
  friendName: z.string().trim().min(3, 'Nome do amigo deve ter no mínimo 3 caracteres').max(100),
  parentName: z.string().trim().min(3, 'Nome do responsável deve ter no mínimo 3 caracteres').max(100),
  parentContact: z.string().trim().min(8, 'Contato deve ter no mínimo 8 caracteres').max(50),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteFriendsModal({ isOpen, onClose, event, studentId }: InviteFriendsModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('event_invitations').insert({
        event_id: event.id,
        inviting_student_id: studentId,
        friend_name: data.friendName,
        friend_contact: data.parentContact, // Temporário: usando contato do responsável como contato do amigo
        parent_name: data.parentName,
        parent_contact: data.parentContact,
      });

      if (error) throw error;

      toast({
        title: 'Amigo convidado com sucesso!',
        description: `Convite enviado para ${data.friendName}.`,
      });

      reset();
      onClose();
    } catch (error: any) {
      console.error('Erro ao criar convite:', error);
      toast({
        title: 'Erro ao convidar amigo',
        description: error.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Convidar Amigo para {event.title}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do amigo e responsável para enviar o convite.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome do Amigo */}
          <div className="space-y-2">
            <Label htmlFor="friendName">Nome do Amigo *</Label>
            <Input
              id="friendName"
              placeholder="Ex: João Silva"
              {...register('friendName')}
              disabled={isSubmitting}
            />
            {errors.friendName && (
              <p className="text-sm text-red-500">{errors.friendName.message}</p>
            )}
          </div>

          {/* Nome do Responsável */}
          <div className="space-y-2">
            <Label htmlFor="parentName">Nome do Responsável *</Label>
            <Input
              id="parentName"
              placeholder="Ex: Maria Silva"
              {...register('parentName')}
              disabled={isSubmitting}
            />
            {errors.parentName && (
              <p className="text-sm text-red-500">{errors.parentName.message}</p>
            )}
          </div>

          {/* Contato do Responsável */}
          <div className="space-y-2">
            <Label htmlFor="parentContact">Contato do Responsável *</Label>
            <Input
              id="parentContact"
              placeholder="Telefone ou Email"
              {...register('parentContact')}
              disabled={isSubmitting}
            />
            {errors.parentContact && (
              <p className="text-sm text-red-500">{errors.parentContact.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Informe o telefone (com DDD) ou email do responsável.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Convite'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
