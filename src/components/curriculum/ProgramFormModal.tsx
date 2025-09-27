import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usePrograms } from '@/hooks/usePrograms';
import { Program } from '@/types/curriculum';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
  curriculumMode: z.enum(['SUBJECTS', 'MODALITIES']),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface ProgramFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  program?: Program | null;
}

export function ProgramFormModal({ open, onOpenChange, program }: ProgramFormModalProps) {
  const { toast } = useToast();
  const { createProgram, updateProgram, programs } = usePrograms();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      curriculumMode: 'SUBJECTS',
      isActive: true,
    },
  });

  useEffect(() => {
    if (program) {
      form.reset({
        name: program.name,
        code: program.code || '',
        description: program.description || '',
        curriculumMode: program.curriculumMode,
        isActive: program.isActive,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        description: '',
        curriculumMode: 'SUBJECTS',
        isActive: true,
      });
    }
  }, [program, form]);

  const onSubmit = async (data: FormData) => {
    try {
      // Validate unique code
      if (data.code) {
        const existingCode = programs.find(p => 
          p.code === data.code && 
          p.id !== program?.id
        );
        
        if (existingCode) {
          toast({
            title: "Erro",
            description: "Já existe um programa com este código.",
            variant: "destructive",
          });
          return;
        }
      }

      const programData = {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        curriculumMode: data.curriculumMode,
        isActive: data.isActive,
      };

      if (program) {
        await updateProgram(program.id, programData);
        toast({
          title: "Programa atualizado",
          description: "O programa foi atualizado com sucesso.",
        });
      } else {
        await createProgram(programData);
        toast({
          title: "Programa criado",
          description: "O programa foi criado com sucesso.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o programa.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {program ? 'Editar Programa' : 'Novo Programa'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Programa *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Inglês" 
                      className="glass-input"
                      {...field} 
                    />
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
                    <Input 
                      placeholder="Ex: ENG" 
                      className="glass-input"
                      {...field} 
                    />
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
                      placeholder="Descrição do programa..." 
                      className="glass-input"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="curriculumMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organização do Currículo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card">
                      <SelectItem value="SUBJECTS">Matérias</SelectItem>
                      <SelectItem value="MODALITIES">Modalidades</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'true')} 
                    value={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="glass-input">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="glass-card">
                      <SelectItem value="true">Ativo</SelectItem>
                      <SelectItem value="false">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="glass-button"
              >
                Cancelar
              </Button>
              <Button type="submit" className="glass-button">
                {program ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}