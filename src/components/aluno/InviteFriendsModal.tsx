import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { InputPhone } from '@/components/ui/input-phone';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/post';
import { Users, Loader2 } from 'lucide-react';
import { onlyDigits } from '@/lib/validation';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Post;
  studentId: string;
}

const inviteSchema = z.object({
  friendName: z.string().trim()
    .min(3, 'Nome do amigo deve ter no mínimo 3 caracteres')
    .max(100, 'Nome do amigo deve ter no máximo 100 caracteres'),
  
  friendContact: z.string()
    .refine((val) => {
      const digits = onlyDigits(val);
      return digits.length >= 10 && digits.length <= 11;
    }, 'Telefone deve ter 10 ou 11 dígitos (DDD + número)'),
  
  parentName: z.string().trim()
    .min(3, 'Nome do responsável deve ter no mínimo 3 caracteres')
    .max(100, 'Nome do responsável deve ter no máximo 100 caracteres'),
  
  parentContact: z.string().trim()
    .min(8, 'Contato deve ter no mínimo 8 caracteres')
    .max(50, 'Contato deve ter no máximo 50 caracteres'),
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteFriendsModal({ isOpen, onClose, event, studentId }: InviteFriendsModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
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
        friend_contact: data.friendContact,
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

          {/* Telefone do Amigo */}
          <div className="space-y-2">
            <Label htmlFor="friendContact">Telefone do Amigo *</Label>
            <Controller
              name="friendContact"
              control={control}
              defaultValue=""
              render={({ field }) => (
                <InputPhone
                  id="friendContact"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isSubmitting}
                  error={errors.friendContact?.message}
                  showError={false}
                  placeholder="(11) 99999-9999"
                />
              )}
            />
            {errors.friendContact && (
              <p className="text-sm text-red-500">{errors.friendContact.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Informe o telefone com DDD. Ex: (51) 99999-9999
            </p>
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
