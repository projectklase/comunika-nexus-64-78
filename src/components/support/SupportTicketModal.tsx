import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HeadphonesIcon, Send, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const priorityOptions = [
  { value: 'normal', label: 'Normal', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  { value: 'high', label: 'Alta', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  { value: 'urgent', label: 'Urgente', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
];

export function SupportTicketModal({ open, onOpenChange, onSuccess }: SupportTicketModalProps) {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const maxDescriptionLength = 2000;

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Por favor, informe o assunto');
      return;
    }
    if (!description.trim()) {
      toast.error('Por favor, descreva sua solicitação');
      return;
    }
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        admin_id: user.id,
        school_id: currentSchool?.id || null,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success('Ticket enviado com sucesso! Nossa equipe entrará em contato em breve.');
      
      setTimeout(() => {
        setSubject('');
        setDescription('');
        setPriority('normal');
        setIsSuccess(false);
        onOpenChange(false);
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao enviar ticket. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setDescription('');
      setPriority('normal');
      setIsSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-purple-500/30 shadow-2xl shadow-purple-500/10 max-w-lg animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <HeadphonesIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Novo Ticket de Suporte</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Nossa equipe responderá em até 24 horas úteis
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Ticket Enviado!</p>
              <p className="text-sm text-muted-foreground mt-1">Entraremos em contato em breve</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Assunto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Ex: Dúvida sobre funcionalidade, Problema técnico..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-purple-500/50 transition-colors"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <RadioGroup
                value={priority}
                onValueChange={setPriority}
                className="flex gap-3"
                disabled={isSubmitting}
              >
                {priorityOptions.map((option) => (
                  <Label
                    key={option.value}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200',
                      priority === option.value
                        ? option.bg
                        : 'bg-background/30 border-border/50 hover:bg-accent/30'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <option.icon className={cn('h-4 w-4', priority === option.value ? option.color : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', priority === option.value ? option.color : 'text-muted-foreground')}>
                      {option.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição <span className="text-destructive">*</span>
                </Label>
                <span className={cn(
                  'text-xs',
                  description.length > maxDescriptionLength * 0.9 ? 'text-orange-400' : 'text-muted-foreground'
                )}>
                  {description.length}/{maxDescriptionLength}
                </span>
              </div>
              <Textarea
                id="description"
                placeholder="Descreva detalhadamente sua solicitação, dúvida ou problema. Quanto mais informações, mais rápido poderemos ajudar..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
                className="min-h-[140px] bg-background/50 border-border/50 focus:border-purple-500/50 transition-colors resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
