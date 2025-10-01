import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSubjects } from '@/hooks/useSubjects';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  code: z.string().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface QuickCreateSubjectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectCreated?: (subjectId: string) => void;
}

export function QuickCreateSubjectSheet({ 
  open, 
  onOpenChange, 
  onSubjectCreated 
}: QuickCreateSubjectSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { createSubject, subjects } = useSubjects();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Verificar se já existe uma matéria com o mesmo nome
      const existingSubject = subjects.find(s => 
        s.name.toLowerCase() === data.name.toLowerCase()
      );
      
      if (existingSubject) {
        toast({
          title: "Matéria já existe",
          description: `Já existe uma matéria com o nome "${data.name}".`,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const newSubject = await createSubject({
        name: data.name,
        code: data.code,
        description: data.description,
        is_active: true,
      });

      toast({
        title: "Matéria criada",
        description: `A matéria "${data.name}" foi criada com sucesso.`,
      });

      form.reset();
      onOpenChange(false);
      onSubjectCreated?.(newSubject.id);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a matéria.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Criar Nova Matéria
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Matéria *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: Matemática, Português..." 
                        disabled={isLoading}
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
                    <FormLabel>Código (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: MAT, PORT..." 
                        disabled={isLoading}
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
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Breve descrição da matéria..." 
                        disabled={isLoading}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Matéria
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </SheetContent>
    </Sheet>
  );
}