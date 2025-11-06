import { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputPhone } from '@/components/ui/input-phone';
import { InputDate } from '@/components/ui/input-date';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Post } from '@/types/post';
import { Users, Loader2, Info } from 'lucide-react';
import { onlyDigits } from '@/lib/validation';
import { parseDateBR } from '@/lib/date-helpers';
import { differenceInYears } from 'date-fns';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import { useEventCapacityValidation, CapacityCheckResult } from '@/hooks/useEventCapacityValidation';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Post;
  studentId: string;
}

const calculateAge = (dobStr: string): number | null => {
  const dob = parseDateBR(dobStr);
  if (!dob) return null;
  
  const today = new Date();
  return differenceInYears(today, dob);
};

const inviteSchema = z.object({
  friendName: z.string().trim()
    .min(3, 'Nome do amigo deve ter no mínimo 3 caracteres')
    .max(100, 'Nome do amigo deve ter no máximo 100 caracteres'),
  
  friendDob: z.string().refine(
    (val) => {
      const dob = parseDateBR(val);
      return dob !== null && dob <= new Date();
    },
    { message: "Data de nascimento inválida ou no futuro" }
  ),
  
  friendContact: z.string().optional(), // Opcional: só obrigatório para maiores de 18
  
  parentName: z.string().trim().optional(),
  
  parentContact: z.string().trim().optional(),
  
  addParentData: z.boolean().default(false),
}).superRefine((data, ctx) => {
  const age = calculateAge(data.friendDob);
  
  if (age === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Data de nascimento inválida',
      path: ['friendDob'],
    });
    return;
  }
  
  const isMinor = age < 18;
  
  // Se MAIOR de 18, telefone do amigo é obrigatório
  if (!isMinor && age !== null) {
    if (!data.friendContact || data.friendContact.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone do amigo é obrigatório para maiores de 18 anos',
        path: ['friendContact'],
      });
    } else {
      const digits = onlyDigits(data.friendContact);
      if (digits.length < 10 || digits.length > 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Telefone deve ter 10 ou 11 dígitos',
          path: ['friendContact'],
        });
      }
    }
  }
  
  // Se menor de 18, nome e telefone do responsável são obrigatórios
  if (isMinor) {
    if (!data.parentName || data.parentName.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nome do responsável é obrigatório para menores de 18 anos',
        path: ['parentName'],
      });
    }
    
    if (!data.parentContact || data.parentContact.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone do responsável é obrigatório para menores de 18 anos',
        path: ['parentContact'],
      });
    } else {
      const digits = onlyDigits(data.parentContact);
      if (digits.length < 10 || digits.length > 11) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Telefone deve ter 10 ou 11 dígitos',
          path: ['parentContact'],
        });
      }
    }
  }
  
  // Se maior de 18 e collapsible aberto, validar telefone se preenchido
  if (!isMinor && data.addParentData && data.parentContact) {
    const digits = onlyDigits(data.parentContact);
    if (digits.length < 10 || digits.length > 11) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Telefone deve ter 10 ou 11 dígitos',
        path: ['parentContact'],
      });
    }
  }
});

type InviteFormData = z.infer<typeof inviteSchema>;

export function InviteFriendsModal({ isOpen, onClose, event, studentId }: InviteFriendsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
  const [showParentData, setShowParentData] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [showInviteMoreDialog, setShowInviteMoreDialog] = useState(false);
  const [capacityCheck, setCapacityCheck] = useState<CapacityCheckResult | null>(null);
  const { checkInvitationLimits } = useEventCapacityValidation();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      friendName: '',
      friendDob: '',
      friendContact: '',
      parentName: '',
      parentContact: '',
      addParentData: false,
    },
  });

  const friendDob = watch('friendDob');

  useEffect(() => {
    if (friendDob) {
      const age = calculateAge(friendDob);
      setCalculatedAge(age);
      
      if (age !== null) {
        const minor = age < 18;
        setIsMinor(minor);
        
        // Se menor, abrir automaticamente e desabilitar checkbox
        if (minor) {
          setShowParentData(true);
          setValue('addParentData', true);
        }
      }
    } else {
      setCalculatedAge(null);
      setIsMinor(false);
    }
  }, [friendDob, setValue]);

  // Verificar limites quando modal abre
  useEffect(() => {
    if (isOpen && event?.id && studentId) {
      checkInvitationLimits(event.id, studentId).then(setCapacityCheck);
    }
  }, [isOpen, event?.id, studentId, checkInvitationLimits]);

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);

    try {
      // Validar limites de capacidade ANTES de inserir
      const limitCheck = await checkInvitationLimits(event.id, studentId);
      
      if (!limitCheck.canInvite) {
        toast({
          title: 'Limite Atingido',
          description: limitCheck.reason,
          variant: 'destructive'
        });
        setIsSubmitting(false);
        return;
      }

      // Converter data dd/mm/yyyy para YYYY-MM-DD para o banco
      const dob = parseDateBR(data.friendDob);
      if (!dob) {
        toast({
          title: 'Erro',
          description: 'Data de nascimento inválida',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      const dobISO = dob.toISOString().split('T')[0]; // YYYY-MM-DD

      const { error } = await supabase.from('event_invitations').insert({
        event_id: event.id,
        inviting_student_id: studentId,
        friend_name: data.friendName,
        friend_dob: dobISO,
        friend_contact: data.friendContact || null, // Pode ser null para menores
        parent_name: data.parentName || null,
        parent_contact: data.parentContact || null,
      });

      if (error) throw error;

      toast({
        title: 'Amigo convidado com sucesso!',
        description: `${data.friendName} foi convidado(a) para o evento.`,
      });

      // ✅ Invalidar queries de desafios para atualizar UI
      queryClient.invalidateQueries({ queryKey: ['student_challenges'] });

      // Mostrar dialog para convidar mais amigos
      setShowInviteMoreDialog(true);
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

  const handleInviteMore = () => {
    reset();
    setCalculatedAge(null);
    setShowParentData(false);
    setIsMinor(false);
    setShowInviteMoreDialog(false);
    // Modal permanece aberto para novo convite
  };

  const handleFinishInviting = () => {
    reset();
    setCalculatedAge(null);
    setShowParentData(false);
    setIsMinor(false);
    setShowInviteMoreDialog(false);
    onClose(); // Fecha o modal principal
  };

  return (
    <>
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
              <p className="text-sm text-destructive">{errors.friendName.message}</p>
            )}
          </div>

          {/* Data de Nascimento com Idade Calculada */}
          <div className="space-y-2">
            <Label htmlFor="friendDob">Data de Nascimento do Amigo *</Label>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Controller
                  name="friendDob"
                  control={control}
                  defaultValue=""
                  render={({ field }) => (
                    <InputDate
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="dd/mm/aaaa"
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
              {calculatedAge !== null && (
                <Badge 
                  variant={isMinor ? "destructive" : "secondary"}
                  className="whitespace-nowrap px-3 py-1"
                >
                  {calculatedAge} {calculatedAge === 1 ? 'ano' : 'anos'}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Digite a data exata de nascimento para calcular a idade
            </p>
            {errors.friendDob && (
              <p className="text-sm text-destructive">{errors.friendDob.message}</p>
            )}
          </div>

          {/* Telefone do Amigo - APENAS para maiores de 18 */}
          {calculatedAge !== null && !isMinor && (
            <div className="space-y-2">
              <Label htmlFor="friendContact">Telefone do Amigo *</Label>
              <Controller
                name="friendContact"
                control={control}
                defaultValue=""
                render={({ field }) => (
                  <InputPhone
                    id="friendContact"
                    value={field.value || ''}
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
                <p className="text-sm text-destructive">{errors.friendContact.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Informe o telefone com DDD. Ex: (51) 99999-9999
              </p>
            </div>
          )}

          {/* Seção de Dados do Responsável - Dinâmica */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="addParentData"
                  checked={showParentData}
                  onCheckedChange={(checked) => {
                    if (!isMinor) {
                      setShowParentData(checked as boolean);
                      setValue('addParentData', checked as boolean);
                    }
                  }}
                  disabled={isMinor || isSubmitting}
                />
                <Label 
                  htmlFor="addParentData" 
                  className={cn(
                    "cursor-pointer",
                    (isMinor || isSubmitting) && "cursor-not-allowed opacity-70"
                  )}
                >
                  {isMinor ? 'Dados do Responsável' : 'Adicionar dados do responsável (opcional)'}
                </Label>
              </div>
              {isMinor && (
                <Badge variant="destructive" className="text-xs">
                  Obrigatório
                </Badge>
              )}
            </div>

            <Collapsible open={showParentData}>
              <CollapsibleContent className="space-y-3 pt-2">
                {/* Nome do Responsável */}
                <div className="space-y-2">
                  <Label htmlFor="parentName">
                    Nome do Responsável {isMinor && '*'}
                  </Label>
                  <Input
                    id="parentName"
                    {...register('parentName')}
                    placeholder="Ex: Maria Silva"
                    disabled={isSubmitting}
                  />
                  {errors.parentName && (
                    <p className="text-sm text-destructive">{errors.parentName.message}</p>
                  )}
                </div>

                {/* Telefone do Responsável */}
                <div className="space-y-2">
                  <Label htmlFor="parentContact">
                    Telefone do Responsável {isMinor && '*'}
                  </Label>
                  <Controller
                    name="parentContact"
                    control={control}
                    defaultValue=""
                    render={({ field }) => (
                      <InputPhone
                        id="parentContact"
                        value={field.value || ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={isSubmitting}
                        error={errors.parentContact?.message}
                        showError={false}
                        placeholder="(11) 99999-9999"
                      />
                    )}
                  />
                  {errors.parentContact && (
                    <p className="text-sm text-destructive">{errors.parentContact.message}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Indicador de Capacidade */}
          {capacityCheck && capacityCheck.max && (
            <Alert className={cn(
              "animate-in fade-in slide-in-from-top-2",
              capacityCheck.canInvite ? "bg-blue-500/10 border-blue-500/30" : "bg-red-500/10 border-red-500/30"
            )}>
              <Info className={cn("h-4 w-4", capacityCheck.canInvite ? "text-blue-400" : "text-red-400")} />
              <AlertDescription>
                {event.eventCapacityType === 'PER_STUDENT' ? (
                  capacityCheck.canInvite ? (
                    <>Você pode convidar até <strong>{capacityCheck.remaining}</strong> amigo(s)</>
                  ) : (
                    <span className="text-red-400 font-medium">{capacityCheck.reason}</span>
                  )
                ) : (
                  capacityCheck.canInvite ? (
                    <>Vagas restantes: <strong>{capacityCheck.remaining}</strong></>
                  ) : (
                    <span className="text-red-400 font-medium">{capacityCheck.reason}</span>
                  )
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || (capacityCheck && !capacityCheck.canInvite)} className="min-w-[160px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                'Confirmar Convidado'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {/* AlertDialog para convidar mais amigos */}
    <AlertDialog open={showInviteMoreDialog} onOpenChange={setShowInviteMoreDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Convidar mais amigos?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Você acabou de confirmar um convite! Deseja convidar mais amigos para este evento?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleFinishInviting}>
            Não, concluir convites
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleInviteMore}>
            Sim, convidar mais
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
