import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useModalities } from '@/hooks/useModalities';
import { useProgramStore } from '@/stores/program-store';
import { useToast } from '@/hooks/use-toast';

const modalitySchema = z.object({
  programId: z.string().min(1, 'Programa é obrigatório'),
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ModalityFormData = z.infer<typeof modalitySchema>;

interface ModalityFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modality?: any;
}

export function ModalityFormModal({ open, onOpenChange, modality }: ModalityFormModalProps) {
  const { createModality, updateModality } = useModalities();
  const { getActivePrograms } = useProgramStore();
  const { toast } = useToast();
  const programs = getActivePrograms();

  const form = useForm<ModalityFormData>({
    resolver: zodResolver(modalitySchema),
    defaultValues: {
      programId: '',
      name: '',
      code: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (modality) {
      form.reset({
        programId: modality.program_id || '',
        name: modality.name,
        code: modality.code || '',
        description: modality.description || '',
        isActive: modality.is_active,
      });
    } else {
      form.reset({
        programId: '',
        name: '',
        code: '',
        description: '',
        isActive: true,
      });
    }
  }, [modality, form]);

  const onSubmit = async (data: ModalityFormData) => {
    try {
      if (modality) {
        await updateModality(modality.id, data);
        toast({ title: 'Modalidade atualizada com sucesso!' });
      } else {
        await createModality({
          name: data.name,
          code: data.code,
          description: data.description,
          is_active: data.isActive,
        });
        toast({ title: 'Modalidade criada com sucesso!' });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      toast({
        title: 'Erro ao salvar modalidade',
        description: 'Tente novamente em alguns minutos.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {modality ? 'Editar Modalidade' : 'Nova Modalidade'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="programId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Programa *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um programa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Regular, Intensivo, Extensivo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: REG, INT, EXT" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva a modalidade..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ativo</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Modalidade disponível para uso
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {modality ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}