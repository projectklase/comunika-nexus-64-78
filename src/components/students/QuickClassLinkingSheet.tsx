import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Users, UserPlus, Filter } from 'lucide-react';
import { useClassStore } from '@/stores/class-store';
import { useSchool } from '@/contexts/SchoolContext';
import { toast } from 'sonner';

interface Student {
  id: string;
  name: string;
  email?: string;
  enrollmentNumber?: string;
  classes?: { id: string; name: string }[];
}

interface QuickClassLinkingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: Student[];
  onStudentsLinked: () => void;
}

export function QuickClassLinkingSheet({ 
  open, 
  onOpenChange, 
  students,
  onStudentsLinked 
}: QuickClassLinkingSheetProps) {
  const { currentSchool } = useSchool();
  const { classes, addStudents } = useClassStore();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithoutClass, setShowOnlyWithoutClass] = useState(true);
  const [isLinking, setIsLinking] = useState(false);

  // Get active classes for current school
  const activeClasses = useMemo(() => {
    return classes.filter(c => c.status === 'ATIVA');
  }, [classes]);

  // Students without any class
  const studentsWithoutClass = useMemo(() => {
    return students.filter(s => !s.classes || s.classes.length === 0);
  }, [students]);

  // Filtered students based on search and filter
  const filteredStudents = useMemo(() => {
    let list = showOnlyWithoutClass ? studentsWithoutClass : students;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(term) ||
        s.email?.toLowerCase().includes(term) ||
        s.enrollmentNumber?.toLowerCase().includes(term)
      );
    }
    
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [students, studentsWithoutClass, showOnlyWithoutClass, searchTerm]);

  // Selected class info
  const selectedClass = useMemo(() => {
    return activeClasses.find(c => c.id === selectedClassId);
  }, [activeClasses, selectedClassId]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleLink = async () => {
    if (!selectedClassId || selectedStudentIds.size === 0) return;
    
    setIsLinking(true);
    try {
      await addStudents(selectedClassId, Array.from(selectedStudentIds));
      toast.success(`${selectedStudentIds.size} aluno(s) vinculado(s) à turma ${selectedClass?.name}`);
      
      // Notify parent to refresh
      onStudentsLinked();
      
      // Reset state
      setSelectedStudentIds(new Set());
      setSelectedClassId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking students:', error);
      toast.error('Erro ao vincular alunos');
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setSelectedStudentIds(new Set());
    setSelectedClassId('');
    setSearchTerm('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Vinculação Rápida
          </SheetTitle>
          <SheetDescription>
            Selecione uma turma e marque os alunos que pertencem a ela
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
          {/* Class selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Turma</label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a turma..." />
              </SelectTrigger>
              <SelectContent>
                {activeClasses.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    <div className="flex items-center gap-2">
                      <span>{cls.name}</span>
                      {cls.code && (
                        <span className="text-muted-foreground text-xs">({cls.code})</span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {cls.students?.length || 0} alunos
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant={showOnlyWithoutClass ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyWithoutClass(!showOnlyWithoutClass)}
              className="gap-2 shrink-0"
            >
              <Filter className="h-4 w-4" />
              Sem Turma
              <Badge variant="secondary" className="ml-1">
                {studentsWithoutClass.length}
              </Badge>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredStudents.length} aluno(s) encontrado(s)</span>
            {selectedStudentIds.size > 0 && (
              <Badge variant="default">
                {selectedStudentIds.size} selecionado(s)
              </Badge>
            )}
          </div>

          {/* Student list */}
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-1">
              {/* Select all */}
              {filteredStudents.length > 0 && (
                <div 
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={handleSelectAll}
                >
                  <Checkbox 
                    checked={selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    {selectedStudentIds.size === filteredStudents.length 
                      ? 'Desmarcar todos' 
                      : 'Selecionar todos'}
                  </span>
                </div>
              )}

              {/* Students */}
              {filteredStudents.map(student => {
                const hasClasses = student.classes && student.classes.length > 0;
                const isSelected = selectedStudentIds.has(student.id);
                
                return (
                  <div
                    key={student.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleToggleStudent(student.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {student.email}
                        {student.enrollmentNumber && ` • ${student.enrollmentNumber}`}
                      </p>
                    </div>
                    {hasClasses && (
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {student.classes?.length} turma(s)
                      </Badge>
                    )}
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {showOnlyWithoutClass 
                      ? 'Todos os alunos já estão em turmas'
                      : 'Nenhum aluno encontrado'}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <Button variant="outline" onClick={handleClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button 
            onClick={handleLink}
            disabled={!selectedClassId || selectedStudentIds.size === 0 || isLinking}
            className="flex-1 sm:flex-none gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Vincular {selectedStudentIds.size > 0 ? `(${selectedStudentIds.size})` : ''}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
