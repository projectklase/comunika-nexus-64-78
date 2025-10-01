import { useEffect, useState } from 'react';
import { useSubjects } from '@/hooks/useSubjects';
import { useClassSubjectStore } from '@/stores/class-subject-store';
import { SchoolClass } from '@/types/class';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface AddSubjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolClass: SchoolClass;
}

export function AddSubjectsModal({ open, onOpenChange, schoolClass }: AddSubjectsModalProps) {
  const { toast } = useToast();
  const { subjects } = useSubjects();
  const { getClassSubjects, addSubjectsToClass } = useClassSubjectStore();
  
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  const classSubjects = getClassSubjects(schoolClass.id);
  const existingSubjectIds = classSubjects.map(cs => cs.subjectId);
  
  // Filter subjects by program and exclude already added ones
  const availableSubjects = subjects
    .filter(subject => 
      subject.is_active &&
      !existingSubjectIds.includes(subject.id) &&
      (searchTerm === '' || subject.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  useEffect(() => {
    if (!open) {
      setSelectedSubjects([]);
      setSearchTerm('');
    }
  }, [open]);

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleAddSubjects = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Nenhuma matéria selecionada",
        description: "Selecione pelo menos uma matéria para adicionar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await addSubjectsToClass(schoolClass.id, selectedSubjects);
      toast({
        title: "Matérias adicionadas",
        description: `${selectedSubjects.length} matéria(s) foram adicionadas ao plano da turma.`,
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar as matérias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-2xl">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Adicionar Matérias à Turma
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar matérias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input pl-10"
            />
          </div>

          {/* Selected Count */}
          {selectedSubjects.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="glass-soft">
                {selectedSubjects.length} matéria(s) selecionada(s)
              </Badge>
            </div>
          )}

          {/* Subjects List */}
          <ScrollArea className="h-96 glass-soft rounded-lg p-4">
            {availableSubjects.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  {searchTerm ? 'Nenhuma matéria encontrada' : 'Todas as matérias já foram adicionadas'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm 
                    ? 'Tente uma busca diferente.'
                    : 'Esta turma já possui todas as matérias disponíveis para o programa.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSubjects.map(subject => (
                  <div
                    key={subject.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/20 cursor-pointer"
                    onClick={() => handleSubjectToggle(subject.id)}
                  >
                    <Checkbox
                      id={subject.id}
                      checked={selectedSubjects.includes(subject.id)}
                      onCheckedChange={() => handleSubjectToggle(subject.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <label 
                        htmlFor={subject.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {subject.name}
                      </label>
                      {subject.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {subject.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="glass-button"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddSubjects}
              disabled={selectedSubjects.length === 0 || loading}
              className="glass-button"
            >
              {loading ? 'Adicionando...' : `Adicionar ${selectedSubjects.length || ''} Matéria(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}