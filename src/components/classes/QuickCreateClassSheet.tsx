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
import { useClasses } from '@/hooks/useClasses';
import { usePrograms } from '@/hooks/usePrograms';
import { useLevels } from '@/hooks/useLevels';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const classSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome muito longo'),
  code: z.string().optional(),
  year: z.coerce.number().min(2000, 'Ano inválido').max(2100, 'Ano inválido'),
});

type ClassFormData = z.infer<typeof classSchema>;

interface QuickCreateClassSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  levelId?: string;
  programId?: string;
  onClassCreated?: (classId: string) => void;
}

export function QuickCreateClassSheet({ 
  open, 
  onOpenChange,
  levelId,
  programId,
  onClassCreated,
}: QuickCreateClassSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { createClass } = useClasses();
  const { programs } = usePrograms();
  const { levels } = useLevels();
  const { currentSchool } = useSchool();
  const { toast } = useToast();

  const selectedProgram = programs.find(p => p.id === programId);
  const selectedLevel = levels.find(l => l.id === levelId);

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: '',
      code: '',
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: ClassFormData) => {
    if (!currentSchool || !levelId) {
      toast({
        title: "Erro",
        description: "Escola ou nível não identificado.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const newClass = await createClass(
        {
          name: data.name.trim(),
          code: data.code?.trim(),
          year: data.year,
          level_id: levelId,
          status: 'Ativa',
        } as any,
        [] // subjectIds vazio - turma rápida sem matérias
      );

      toast({
        title: "Turma criada",
        description: `A turma "${data.name}" foi criada com sucesso.`,
      });

      // Notificar o componente pai
      onClassCreated?.(newClass.id);
      
      // Fechar sheet e resetar form
      onOpenChange(false);
      form.reset();
      
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a turma. Tente novamente.",
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
          <DialogTitle>Criar Turma</DialogTitle>
          <DialogDescription>
            Crie rapidamente uma turma para este nível
          </DialogDescription>
        </DialogHeader>

        {/* Informações contextuais */}
        <div className="flex flex-wrap gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
          {selectedProgram && (
            <Badge variant="outline" className="gap-1">
              <span className="text-xs text-muted-foreground">Programa:</span>
              {selectedProgram.name}
            </Badge>
          )}
          {selectedLevel && (
            <Badge variant="outline" className="gap-1">
              <span className="text-xs text-muted-foreground">Nível:</span>
              {selectedLevel.name}
            </Badge>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Turma *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Turma A, Manhã, Intermediário 1" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Nome identificador da turma
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
                      placeholder="Ex: A1, INT-MAT, 6A"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Código curto (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      placeholder="2024"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Ano letivo da turma
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
                Criar Turma
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
