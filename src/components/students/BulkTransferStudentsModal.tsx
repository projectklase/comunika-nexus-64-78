import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowRightLeft, AlertTriangle, Loader2 } from 'lucide-react';
import { useClassStore } from '@/stores/class-store';
import { useSchool } from '@/contexts/SchoolContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StudentWithClasses {
  id: string;
  name: string;
  classes: { id: string; name: string }[];
}

interface BulkTransferStudentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentIds: string[];
  onSuccess?: () => void;
}

export function BulkTransferStudentsModal({
  open,
  onOpenChange,
  studentIds,
  onSuccess
}: BulkTransferStudentsModalProps) {
  const { currentSchool } = useSchool();
  const { classes, loadClasses, transferStudents, loading: classesLoading } = useClassStore();
  
  const [studentsData, setStudentsData] = useState<StudentWithClasses[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>('');
  const [targetClassId, setTargetClassId] = useState<string>('');

  // Load classes when modal opens
  useEffect(() => {
    if (open && currentSchool?.id) {
      loadClasses(currentSchool.id);
    }
  }, [open, currentSchool?.id, loadClasses]);

  // Load student data with their classes
  useEffect(() => {
    const loadStudents = async () => {
      if (!open || studentIds.length === 0) return;
      
      setLoading(true);
      try {
        // Get students with their class assignments
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', studentIds);

        if (profilesError) throw profilesError;

        // Get class assignments for these students
        const { data: classStudents, error: classError } = await supabase
          .from('class_students')
          .select(`
            student_id,
            class_id,
            classes:class_id (id, name, status)
          `)
          .in('student_id', studentIds);

        if (classError) throw classError;

        // Map students with their classes
        const studentsWithClasses: StudentWithClasses[] = (profiles || []).map(profile => {
          const studentClassAssignments = (classStudents || [])
            .filter(cs => cs.student_id === profile.id && (cs.classes as any)?.status === 'Ativa')
            .map(cs => ({
              id: (cs.classes as any).id,
              name: (cs.classes as any).name
            }));

          return {
            id: profile.id,
            name: profile.name,
            classes: studentClassAssignments
          };
        });

        setStudentsData(studentsWithClasses);
      } catch (error) {
        console.error('Error loading students:', error);
        toast.error('Erro ao carregar dados dos alunos');
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [open, studentIds]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedSourceClassId('');
      setTargetClassId('');
      setStudentsData([]);
    }
  }, [open]);

  // Get active classes
  const activeClasses = useMemo(() => {
    return classes.filter(c => c.status === 'ATIVA');
  }, [classes]);

  // Separate students by whether they have classes
  const { studentsWithClasses, studentsWithoutClasses } = useMemo(() => {
    const withClasses = studentsData.filter(s => s.classes.length > 0);
    const withoutClasses = studentsData.filter(s => s.classes.length === 0);
    return { studentsWithClasses: withClasses, studentsWithoutClasses: withoutClasses };
  }, [studentsData]);

  // Get unique source classes from selected students
  const sourceClasses = useMemo(() => {
    const classMap = new Map<string, { id: string; name: string; studentCount: number }>();
    
    studentsWithClasses.forEach(student => {
      student.classes.forEach(cls => {
        const existing = classMap.get(cls.id);
        if (existing) {
          existing.studentCount++;
        } else {
          classMap.set(cls.id, { ...cls, studentCount: 1 });
        }
      });
    });

    return Array.from(classMap.values());
  }, [studentsWithClasses]);

  // Auto-select source class if all students are in the same class
  useEffect(() => {
    if (sourceClasses.length === 1 && !selectedSourceClassId) {
      setSelectedSourceClassId(sourceClasses[0].id);
    }
  }, [sourceClasses, selectedSourceClassId]);

  // Get students that will be transferred (those in the selected source class)
  const studentsToTransfer = useMemo(() => {
    if (!selectedSourceClassId) return [];
    return studentsWithClasses.filter(s => 
      s.classes.some(c => c.id === selectedSourceClassId)
    );
  }, [studentsWithClasses, selectedSourceClassId]);

  // Available target classes (exclude source)
  const targetClasses = useMemo(() => {
    return activeClasses.filter(c => c.id !== selectedSourceClassId);
  }, [activeClasses, selectedSourceClassId]);

  const handleTransfer = async () => {
    if (!selectedSourceClassId || !targetClassId) {
      toast.error('Selecione a turma de origem e destino');
      return;
    }

    if (studentsToTransfer.length === 0) {
      toast.error('Nenhum aluno para transferir');
      return;
    }

    setTransferring(true);
    try {
      const studentIdsToTransfer = studentsToTransfer.map(s => s.id);
      await transferStudents(selectedSourceClassId, targetClassId, studentIdsToTransfer);
      
      const targetClass = activeClasses.find(c => c.id === targetClassId);
      toast.success(`${studentsToTransfer.length} aluno(s) transferido(s) para ${targetClass?.name}`);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error transferring students:', error);
      toast.error('Erro ao transferir alunos');
    } finally {
      setTransferring(false);
    }
  };

  const isLoading = loading || classesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-lg">
        <DialogHeader>
          <DialogTitle className="gradient-text flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Transferir Alunos
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando...</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Warning for students without classes */}
            {studentsWithoutClasses.length > 0 && (
              <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-500">
                      {studentsWithoutClasses.length} aluno(s) sem turma
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Os seguintes alunos não estão vinculados a nenhuma turma e não podem ser transferidos:
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {studentsWithoutClasses.map(s => (
                        <Badge key={s.id} variant="outline" className="text-xs">
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {studentsWithClasses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                Nenhum aluno selecionado está vinculado a uma turma.
                <br />
                <span className="text-sm">Use "Vincular" para adicionar alunos a turmas primeiro.</span>
              </div>
            ) : (
              <>
                {/* Source class selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma de Origem</label>
                  {sourceClasses.length === 1 ? (
                    <div className="glass-input rounded-md px-3 py-2 text-sm">
                      {sourceClasses[0].name}
                      <span className="text-muted-foreground ml-2">
                        ({sourceClasses[0].studentCount} aluno(s) selecionado(s))
                      </span>
                    </div>
                  ) : (
                    <Select value={selectedSourceClassId} onValueChange={setSelectedSourceClassId}>
                      <SelectTrigger className="glass-input">
                        <SelectValue placeholder="Selecione a turma de origem..." />
                      </SelectTrigger>
                      <SelectContent className="glass-card">
                        {sourceClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{cls.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({cls.studentCount} selecionado(s))
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Students to transfer */}
                {selectedSourceClassId && studentsToTransfer.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Alunos a Transferir ({studentsToTransfer.length})
                    </label>
                    <ScrollArea className="max-h-32">
                      <div className="flex flex-wrap gap-1.5">
                        {studentsToTransfer.map(s => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Target class selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Turma de Destino</label>
                  <Select 
                    value={targetClassId} 
                    onValueChange={setTargetClassId}
                    disabled={!selectedSourceClassId}
                  >
                    <SelectTrigger className="glass-input">
                      <SelectValue placeholder="Selecione a turma de destino..." />
                    </SelectTrigger>
                    <SelectContent className="glass-card">
                      {targetClasses.length === 0 ? (
                        <div className="p-2 text-center text-sm text-muted-foreground">
                          Nenhuma turma disponível
                        </div>
                      ) : (
                        targetClasses.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{cls.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {cls.students?.length || 0} alunos
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="glass-button"
                    disabled={transferring}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleTransfer}
                    disabled={!selectedSourceClassId || !targetClassId || studentsToTransfer.length === 0 || transferring}
                    className="glass-button"
                  >
                    {transferring ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                    )}
                    Transferir
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
