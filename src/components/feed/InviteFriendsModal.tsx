import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Loader2 } from 'lucide-react';
import { z } from 'zod';

// Validação com Zod
const invitationSchema = z.object({
  friendName: z.string().trim().min(2, 'Nome do amigo deve ter pelo menos 2 caracteres').max(100),
  parentName: z.string().trim().min(2, 'Nome do responsável deve ter pelo menos 2 caracteres').max(100),
  parentContact: z.string().trim().min(8, 'Contato do responsável é obrigatório').max(100),
});

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export function InviteFriendsModal({ isOpen, onClose, eventId, eventTitle }: InviteFriendsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    friendName: '',
    parentName: '',
    parentContact: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para convidar amigos.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validação client-side
    try {
      invitationSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }
    }
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('event_invitations')
        .insert({
          event_id: eventId,
          inviting_student_id: user.id,
          friend_name: formData.friendName.trim(),
          parent_name: formData.parentName.trim(),
          parent_contact: formData.parentContact.trim(),
        });
      
      if (error) throw error;
      
      toast({
        title: 'Convite enviado!',
        description: 'Seu amigo foi convidado com sucesso. A equipe da escola entrará em contato com o responsável.',
      });
      
      // Reset form
      setFormData({ friendName: '', parentName: '', parentContact: '' });
      onClose();
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      toast({
        title: 'Erro ao enviar convite',
        description: error.message || 'Ocorreu um erro ao processar seu convite. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convidar Amigo para o Evento
          </DialogTitle>
          <DialogDescription>
            Convide um amigo externo para participar de "{eventTitle}". 
            A equipe da escola entrará em contato com o responsável.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Amigo */}
          <div className="space-y-2">
            <Label htmlFor="friendName">Nome do Amigo *</Label>
            <Input
              id="friendName"
              value={formData.friendName}
              onChange={(e) => setFormData(prev => ({ ...prev, friendName: e.target.value }))}
              placeholder="Ex: João Silva"
              maxLength={100}
              required
            />
            {errors.friendName && (
              <p className="text-sm text-destructive">{errors.friendName}</p>
            )}
          </div>
          
          {/* Nome do Responsável */}
          <div className="space-y-2">
            <Label htmlFor="parentName">Nome do Responsável *</Label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => setFormData(prev => ({ ...prev, parentName: e.target.value }))}
              placeholder="Ex: Maria Silva"
              maxLength={100}
              required
            />
            {errors.parentName && (
              <p className="text-sm text-destructive">{errors.parentName}</p>
            )}
          </div>
          
          {/* Contato do Responsável */}
          <div className="space-y-2">
            <Label htmlFor="parentContact">Telefone ou Email do Responsável *</Label>
            <Input
              id="parentContact"
              value={formData.parentContact}
              onChange={(e) => setFormData(prev => ({ ...prev, parentContact: e.target.value }))}
              placeholder="Ex: (11) 98765-4321 ou email@exemplo.com"
              maxLength={100}
              required
            />
            {errors.parentContact && (
              <p className="text-sm text-destructive">{errors.parentContact}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Pode ser telefone ou email. A equipe da escola usará este contato.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Enviar Convite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
