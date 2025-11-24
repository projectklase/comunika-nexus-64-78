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
import { Button } from '@/components/ui/button';
import { usePrograms } from '@/hooks/usePrograms';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const programSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type ProgramFormData = z.infer<typeof programSchema>;

interface QuickCreateProgramSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgramCreated?: (programId: string) => void;
  initialName?: string;
}

export function QuickCreateProgramSheet({ 
  open, 
  onOpenChange,
  onProgramCreated,
  initialName 
}: QuickCreateProgramSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createProgram, programs } = usePrograms();
  const { toast } = useToast();

  const form = useForm<ProgramFormData>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  // Pré-preencher nome quando initialName mudar
  React.useEffect(() => {
    if (open && initialName) {
      form.setValue('name', initialName);
    }
  }, [open, initialName, form]);

  const onSubmit = async (data: ProgramFormData) => {
    setIsLoading(true);
    
    try {
      // Verificar duplicado (case-insensitive)
      const isDuplicate = programs.some(program => 
        program.name.toLowerCase() === data.name.toLowerCase() &&
        program.isActive
      );

      if (isDuplicate) {
        toast({
          title: "Programa já existe",
          description: "Já existe um programa com este nome.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newProgram = await createProgram({
        name: data.name.trim(),
        code: data.code?.trim(),
        description: data.description?.trim(),
        curriculumMode: 'SUBJECTS',
        isActive: true,
      });

      toast({
        title: "Programa criado",
        description: `O programa "${newProgram.name}" foi criado com sucesso.`,
      });

      // Notificar o componente pai
      onProgramCreated?.(newProgram.id);
      
      // Fechar sheet e resetar form
      onOpenChange(false);
      form.reset();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o programa. Tente novamente.",
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
      <DialogContent className="sm:max-w-md backdrop-blur-xl bg-background/95 border border-white/10">
        <DialogHeader>
          <DialogTitle>Criar Programa</DialogTitle>
          <DialogDescription>
            Adicione um novo programa educacional para sua escola
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Inglês, Matemática, Futebol" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome do programa educacional
                  </FormDescription>
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
                      placeholder="Ex: ING, MAT, FUT"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Código curto para identificação (opcional)
                  </FormDescription>
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
                    <Input 
                      placeholder="Descrição opcional do programa"
                      {...field} 
                    />
                  </FormControl>
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
                Criar Programa
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
