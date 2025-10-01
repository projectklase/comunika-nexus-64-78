import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClasses } from '@/hooks/useClasses';
import { useLevels } from '@/hooks/useLevels';
import { useModalities } from '@/hooks/useModalities';
import { useSubjects } from '@/hooks/useSubjects';
import { ClassFilters } from '@/types/class';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClassFormModal } from './ClassFormModal';
import { AssignTeachersDialog } from './AssignTeachersDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { BulkActions } from './BulkActions';
import { 
  MoreHorizontal, 
  Edit, 
  Users, 
  Eye, 
  Archive, 
  ArchiveRestore,
  Trash2 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClassTableProps {
  filters: ClassFilters;
}

export function ClassTable({ filters }: ClassTableProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    classes,
    loading,
    archiveClass, 
    unarchiveClass, 
    deleteClass 
  } = useClasses();
  const { levels } = useLevels();
  const { modalities } = useModalities();
  const { subjects } = useSubjects();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingClass, setEditingClass] = useState<string | null>(null);
  const [assigningTeachers, setAssigningTeachers] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'archive' | 'unarchive' | 'delete';
    classId: string;
  } | null>(null);

  // Apply filters
  const filteredClasses = classes.filter(cls => {
    // Status filter
    if (filters.status && cls.status !== filters.status) return false;
    
    // Level filter
    if (filters.levelId && cls.levelId !== filters.levelId) return false;
    
    // Modality filter
    if (filters.modalityId && cls.modalityId !== filters.modalityId) return false;
    
    // Year filter
    if (filters.year && cls.year !== filters.year) return false;
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        cls.name.toLowerCase().includes(searchLower) ||
        cls.code?.toLowerCase().includes(searchLower) ||
        cls.grade?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const editClass = editingClass ? filteredClasses.find(c => c.id === editingClass) : null;
  const confirmClass = confirmAction ? filteredClasses.find(c => c.id === confirmAction.classId) : null;

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredClasses.map(c => c.id) : []);
  };

  const handleSelectRow = (classId: string, checked: boolean) => {
    setSelectedIds(prev => 
      checked 
        ? [...prev, classId]
        : prev.filter(id => id !== classId)
    );
  };

  const handleAction = async (action: 'archive' | 'unarchive' | 'delete', classId: string) => {
    try {
      switch (action) {
        case 'archive':
          await archiveClass(classId);
          toast({ title: "Turma arquivada com sucesso" });
          break;
        case 'unarchive':
          await unarchiveClass(classId);
          toast({ title: "Turma desarquivada com sucesso" });
          break;
        case 'delete':
          await deleteClass(classId);
          toast({ title: "Turma excluída com sucesso" });
          break;
      }
      setConfirmAction(null);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível executar a ação.",
        variant: "destructive",
      });
    }
  };

  const getTeacherNames = (teacherIds: string[]) => {
    // For now, just return placeholder names
    // This will be properly implemented when we fetch teacher data
    return teacherIds.map((_, index) => `Professor ${index + 1}`);
  };

  const getLevelName = (levelId?: string) => {
    if (!levelId) return '—';
    const level = levels.find(l => l.id === levelId);
    return level?.name || 'Nível não encontrado';
  };

  const getModalityName = (modalityId?: string) => {
    if (!modalityId) return '—';
    const modality = modalities.find(m => m.id === modalityId);
    return modality?.name || 'Modalidade não encontrada';
  };

  const getSubjectNames = (subjectIds?: string[]) => {
    if (!subjectIds || subjectIds.length === 0) return [];
    return subjectIds.map(id => {
      const subject = subjects.find(s => s.id === id);
      return subject?.name || 'Matéria não encontrada';
    });
  };

  const formatSchedule = (daysOfWeek: string[], startTime: string, endTime: string) => {
    const dayShorts: { [key: string]: string } = {
      'Segunda': 'Seg',
      'Terça': 'Ter', 
      'Quarta': 'Qua',
      'Quinta': 'Qui',
      'Sexta': 'Sex',
      'Sábado': 'Sáb',
      'Domingo': 'Dom'
    };
    
    const shortDays = daysOfWeek.map(day => dayShorts[day] || day).join(', ');
    return `${shortDays} — ${startTime}–${endTime}`;
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <BulkActions 
          selectedIds={selectedIds}
          onComplete={() => setSelectedIds([])}
        />
      )}

      <div className="rounded-md border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === classes.length && classes.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Dias/Horário</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Modalidade</TableHead>
              <TableHead>Matérias</TableHead>
              <TableHead>Série/Ano</TableHead>
              <TableHead>Professores</TableHead>
              <TableHead>Alunos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-16">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Carregando turmas...
                </TableCell>
              </TableRow>
            ) : filteredClasses.map((schoolClass) => {
              const teacherNames = getTeacherNames(schoolClass.teachers);
              const subjectNames = getSubjectNames(schoolClass.subjectIds);
              
              return (
                <TableRow 
                  key={schoolClass.id} 
                  className="hover:bg-muted/20 transition-colors"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(schoolClass.id)}
                      onCheckedChange={(checked) => 
                        handleSelectRow(schoolClass.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">{schoolClass.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {schoolClass.code || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {schoolClass.daysOfWeek && schoolClass.startTime && schoolClass.endTime
                      ? formatSchedule(schoolClass.daysOfWeek, schoolClass.startTime, schoolClass.endTime)
                      : '—'
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getLevelName(schoolClass.levelId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getModalityName(schoolClass.modalityId)}
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="cursor-help">
                            {subjectNames.length} matéria(s)
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 max-w-xs">
                            {subjectNames.length > 0 ? (
                              subjectNames.map((name, index) => (
                                <div key={index}>{name}</div>
                              ))
                            ) : (
                              <div>Nenhuma matéria selecionada</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {schoolClass.grade && schoolClass.year 
                      ? `${schoolClass.grade} (${schoolClass.year})`
                      : schoolClass.grade || schoolClass.year || '—'
                    }
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="cursor-help">
                            {schoolClass.teachers.length}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            {teacherNames.length > 0 ? (
                              teacherNames.map((name, index) => (
                                <div key={index}>{name}</div>
                              ))
                            ) : (
                              <div>Nenhum professor atribuído</div>
                            )}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {schoolClass.students.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={schoolClass.status === 'ATIVA' ? 'default' : 'secondary'}
                      className={schoolClass.status === 'ATIVA' ? 'bg-green-500/20 text-green-300' : ''}
                    >
                      {schoolClass.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card">
                        <DropdownMenuItem onClick={() => setEditingClass(schoolClass.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAssigningTeachers(schoolClass.id)}>
                          <Users className="mr-2 h-4 w-4" />
                          Atribuir Professores
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/secretaria/turmas/${schoolClass.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setConfirmAction({
                            type: schoolClass.status === 'ATIVA' ? 'archive' : 'unarchive',
                            classId: schoolClass.id
                          })}
                        >
                          {schoolClass.status === 'ATIVA' ? (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Arquivar
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Desarquivar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setConfirmAction({
                            type: 'delete',
                            classId: schoolClass.id
                          })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {!loading && filteredClasses.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhuma turma encontrada com os filtros aplicados.
          </div>
        )}
      </div>

      {/* Modals */}
      <ClassFormModal
        open={!!editingClass}
        onOpenChange={(open) => !open && setEditingClass(null)}
        schoolClass={editClass}
      />

      <AssignTeachersDialog
        open={!!assigningTeachers}
        onOpenChange={(open) => !open && setAssigningTeachers(null)}
        classId={assigningTeachers || ''}
        currentTeachers={assigningTeachers ? filteredClasses.find(c => c.id === assigningTeachers)?.teachers || [] : []}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction?.type === 'delete' 
            ? 'Excluir Turma'
            : confirmAction?.type === 'archive'
            ? 'Arquivar Turma'
            : 'Desarquivar Turma'
        }
        description={
          confirmAction?.type === 'delete'
            ? confirmClass?.students.length
              ? `Esta turma possui ${confirmClass.students.length} aluno(s). Ao excluí-la, todos os vínculos serão removidos.`
              : 'Esta ação não pode ser desfeita.'
            : confirmAction?.type === 'archive'
            ? 'Turmas arquivadas não aparecem em seleções de audiência.'
            : 'A turma voltará a aparecer em seleções de audiência.'
        }
        confirmText={
          confirmAction?.type === 'delete' 
            ? 'Excluir'
            : confirmAction?.type === 'archive'
            ? 'Arquivar'
            : 'Desarquivar'
        }
        onConfirm={() => confirmAction && handleAction(confirmAction.type, confirmAction.classId)}
        variant={confirmAction?.type === 'delete' ? 'destructive' : 'default'}
      />
    </div>
  );
}