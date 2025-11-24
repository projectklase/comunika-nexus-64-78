import React, { useState } from 'react';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { InputPhone } from '@/components/ui/input-phone';
import { Button } from '@/components/ui/button';
import { usePeopleStore } from '@/stores/people-store';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { validateEmail, validatePhone } from '@/lib/validation';
import { useDuplicateCheck } from '@/hooks/useDuplicateCheck';
import { useSchool } from '@/contexts/SchoolContext';
import { DuplicateWarning } from '@/components/forms/DuplicateWarning';
import { normalizePhoneForComparison } from '@/lib/phone-utils';

const quickTeacherSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(120, 'Nome muito longo'),
  email: z.string().min(1, 'E-mail é obrigatório').refine((val) => {
    return validateEmail(val) === null;
  }, 'E-mail inválido'),
  phone: z.string().min(1, 'Telefone é obrigatório').refine((val) => {
    return validatePhone(val) === null;
  }, 'Telefone inválido'),
});

type QuickTeacherFormData = z.infer<typeof quickTeacherSchema>;

interface QuickTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeacherCreated?: (teacherId: string) => void;
}

export function QuickTeacherModal({ 
  open, 
  onOpenChange,
  onTeacherCreated 
}: QuickTeacherModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createTeacher, people } = usePeopleStore();
  const { toast } = useToast();
  const { currentSchool } = useSchool();
  const { checkDuplicates } = useDuplicateCheck(currentSchool?.id || null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);

  const form = useForm<QuickTeacherFormData>({
    resolver: zodResolver(quickTeacherSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
    },
  });

  const onSubmit = async (data: QuickTeacherFormData) => {
    setIsLoading(true);
    
    try {
      // Verificar e-mail duplicado
      const isDuplicateEmail = people.some(person => 
        person.teacher?.email?.toLowerCase() === data.email.toLowerCase() ||
        person.email?.toLowerCase() === data.email.toLowerCase()
      );

      if (isDuplicateEmail) {
        toast({
          title: "E-mail já cadastrado",
          description: "Já existe um professor com este e-mail.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newTeacher = await createTeacher({
        name: data.name.trim(),
        role: 'PROFESSOR',
        isActive: true,
        teacher: {
          email: data.email.trim(),
          phones: [data.phone.trim()],
        },
      });

      toast({
        title: "Professor criado",
        description: `O professor "${newTeacher.name}" foi criado com sucesso.`,
      });

      // Notificar o componente pai
      onTeacherCreated?.(newTeacher.id);
      
      // Fechar modal e resetar form
      onOpenChange(false);
      form.reset();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o professor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Professor</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente um novo professor com os dados essenciais
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: João Silva" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome completo do professor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail *</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="professor@escola.com"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    E-mail profissional do professor
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <InputPhone 
                      placeholder="(11) 99999-9999"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={async () => {
                        const phone = field.value?.trim();
                        if (phone && validatePhone(phone) === null) {
                          const result = await checkDuplicates({ phone });
                          
                          if (result.hasSimilarities && result.similarities.some(s => s.type === 'phone')) {
                            const issue = result.similarities.find(s => s.type === 'phone');
                            const duplicateUser = issue?.existingUsers?.[0];
                            const errorMsg = `✕ Telefone já cadastrado${duplicateUser ? ` (${duplicateUser.name})` : ''}`;
                            
                            // Erro inline via React Hook Form
                            form.setError('phone', {
                              type: 'manual',
                              message: errorMsg
                            });
                            
                            // Mantém modal também
                            setDuplicateCheck(result);
                            setShowDuplicateModal(true);
                          }
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Telefone principal para contato
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Professor
              </Button>
            </div>
          </form>
        </Form>

        {/* Modal de alerta de duplicatas */}
        {showDuplicateModal && duplicateCheck && (
          <DuplicateWarning
            issues={[{
              type: 'critical',
              field: 'phone',
              message: 'Este telefone já está cadastrado no sistema',
              existingUsers: duplicateCheck.similarities
                .filter((s: any) => s.type === 'phone')
                .flatMap((s: any) => s.matches)
            }]}
            hasBlocking={false}
            onCancel={() => setShowDuplicateModal(false)}
            onConfirm={() => {
              setShowDuplicateModal(false);
              // Permite continuar mesmo com duplicata (soft warning)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}