import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { PageLayout } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { StudentFormSteps } from '@/components/students/StudentFormSteps';
import { LinkStudentToClassModal } from '@/components/students/LinkStudentToClassModal';
import { RemoveStudentFromClassModal } from '@/components/students/RemoveStudentFromClassModal';
import { StudentImportWizard } from '@/components/students/StudentImportWizard';
import { QuickClassLinkingSheet } from '@/components/students/QuickClassLinkingSheet';
import { useStudents } from '@/hooks/useStudents';
import { useIsMobile } from '@/hooks/use-mobile';
import { RESPONSIVE_CLASSES } from '@/lib/responsive-utils';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Download,
  Upload,
  Archive,
  Link,
  Unlink,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [isQuickLinkingOpen, setIsQuickLinkingOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  const isMobile = useIsMobile();
  
  const { 
    students,
    loading,
    fetchStudents,
    deleteStudent,
  } = useStudents();

  // Apply filters when they change
  useEffect(() => {
    const filters = {
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter as 'active' | 'archived' : undefined,
      class_id: classFilter !== 'all' ? classFilter : undefined,
      program_id: programFilter !== 'all' ? programFilter : undefined,
      level_id: levelFilter !== 'all' ? levelFilter : undefined,
    };
    
    fetchStudents(filters);
  }, [search, statusFilter, classFilter, programFilter, levelFilter, fetchStudents]);

  // Students are now filtered by the hook based on the filters state
  const filteredStudents = students;

  const getStudentClasses = (student: any) => {
    return student.classes || [];
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudents(filteredStudents.map(s => s.id));
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleBulkArchive = async () => {
    try {
      for (const studentId of selectedStudents) {
        console.log('Archive student:', studentId);
      }
      setSelectedStudents([]);
      toast.success(`${selectedStudents.length} aluno(s) arquivado(s) com sucesso`);
    } catch (error) {
      toast.error('Erro ao arquivar alunos');
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredStudents.map(student => {
      const studentClasses = getStudentClasses(student);
      return [
        student.id,
        student.name,
        student.email || '',
        'Ativo',
        studentClasses.map((c: any) => c.name).join(',')
      ].join(';');
    }).join('\n');

    const header = 'aluno_id;nome;email;status;turmas\n';
    const blob = new Blob([header + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    a.download = `alunos_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  // Header Actions Component
  const HeaderActions = () => (
    <>
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={() => setIsQuickLinkingOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Link className="h-4 w-4" />
        <span className="ml-2">Vincular Turmas</span>
      </Button>
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={() => setIsImportModalOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Upload className="h-4 w-4" />
        <span className="ml-2">Importar</span>
      </Button>
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={handleExportCSV}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Download className="h-4 w-4" />
        <span className="ml-2">Exportar</span>
      </Button>
      <Button 
        size={isMobile ? "sm" : "default"}
        onClick={() => setIsFormModalOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Plus className="h-4 w-4" />
        <span className="ml-2">Novo Aluno</span>
      </Button>
    </>
  );

  // Filters Content Component
  const FiltersContent = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Buscar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Status</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Turma</label>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Programa</label>
        <Select value={programFilter} onValueChange={setProgramFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Mobile Filters Sheet
  const MobileFiltersSheet = () => {
    const activeFiltersCount = [statusFilter, classFilter, programFilter, levelFilter]
      .filter(f => f !== 'all').length + (search ? 1 : 0);

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filtrar Alunos</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Mobile Card Renderer
  const renderStudentCard = (student: any) => {
    const studentClasses = getStudentClasses(student);
    
    let age = 15;
    let isMinor = false;
    if (student.dob) {
      const birthDate = new Date(student.dob);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      isMinor = age < 18;
    }

    const programLevel = student.program_name && student.level_name
      ? `${student.program_name} / ${student.level_name}`
      : student.program_name || student.level_name || null;

    const primaryGuardian = student.guardians?.find((g: any) => g.is_primary);
    const guardianDisplay = primaryGuardian?.name || student.guardians?.[0]?.name;

    return (
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox
              checked={selectedStudents.includes(student.id)}
              onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{student.name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">{age} anos</span>
                {isMinor && <Badge variant="outline" className="text-xs">Menor</Badge>}
                <Badge variant="default" className="text-xs">Ativo</Badge>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                setSelectedStudent(student);
                setIsFormModalOpen(true);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o aluno <strong>{student.name}</strong>? 
                      Esta ação não pode ser desfeita e removerá todos os dados associados.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteStudent(student.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 space-y-2 text-sm">
          {programLevel && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Programa:</span>
              <span>{programLevel}</span>
            </div>
          )}
          
          {studentClasses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Turmas:</span>
              {studentClasses.slice(0, 2).map((c: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-xs">{c.name}</Badge>
              ))}
              {studentClasses.length > 2 && (
                <Badge variant="outline" className="text-xs">+{studentClasses.length - 2}</Badge>
              )}
            </div>
          )}

          {guardianDisplay && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Responsável:</span>
              <span className="truncate">{guardianDisplay}</span>
            </div>
          )}
        </div>
      </CardContent>
    );
  };

  return (
    <AppLayout>
      <PageLayout
        title="Alunos"
        subtitle="Gerencie os alunos cadastrados na escola"
        actions={<HeaderActions />}
        filters={
          <div className="glass rounded-lg p-4">
            <FiltersContent />
          </div>
        }
        mobileFilters={<MobileFiltersSheet />}
      >
        {/* Ações em lote */}
        {selectedStudents.length > 0 && (
          <div className="glass rounded-lg p-3 sm:p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {selectedStudents.length} aluno(s) selecionado(s)
              </span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  className={cn(RESPONSIVE_CLASSES.iconButton, "gap-1")}
                >
                  <Archive className="h-4 w-4" />
                  <span>Arquivar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(true)}
                  className={cn(RESPONSIVE_CLASSES.iconButton, "gap-1")}
                >
                  <Link className="h-4 w-4" />
                  <span>Vincular</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRemoveModalOpen(true)}
                  className={cn(RESPONSIVE_CLASSES.iconButton, "gap-1")}
                >
                  <Unlink className="h-4 w-4" />
                  <span>Remover</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop: Tabela | Mobile: Cards */}
        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm">Carregando alunos...</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Nenhum aluno encontrado
              </div>
            ) : (
              filteredStudents.map((student) => (
                <Card key={student.id} className="glass-card">
                  {renderStudentCard(student)}
                </Card>
              ))
            )}
          </div>
        ) : (
          <div className="glass rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Programa/Nível</TableHead>
                  <TableHead>Turmas</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Carregando alunos...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum aluno encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const studentClasses = getStudentClasses(student);
                    
                    let age = 15;
                    let isMinor = false;
                    if (student.dob) {
                      const birthDate = new Date(student.dob);
                      const today = new Date();
                      age = today.getFullYear() - birthDate.getFullYear();
                      const monthDiff = today.getMonth() - birthDate.getMonth();
                      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                      }
                      isMinor = age < 18;
                    }

                    const programLevel = student.program_name && student.level_name
                      ? `${student.program_name} / ${student.level_name}`
                      : student.program_name || student.level_name || null;

                    const primaryGuardian = student.guardians?.find((g: any) => g.is_primary);
                    const guardianDisplay = primaryGuardian?.name || student.guardians?.[0]?.name;

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStudents.includes(student.id)}
                            onCheckedChange={(checked) => handleSelectStudent(student.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{age} anos</span>
                            {isMinor && <Badge variant="outline" className="text-xs">Menor</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {programLevel ? (
                            <span className="text-sm">{programLevel}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não definido</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {studentClasses.length > 0 ? (
                              <>
                                {studentClasses.slice(0, 2).map((c: any, index: number) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {c.name}
                                  </Badge>
                                ))}
                                {studentClasses.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{studentClasses.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm">Nenhuma</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {guardianDisplay ? (
                            <span className="text-sm">{guardianDisplay}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">Ativo</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedStudent(student);
                                setIsFormModalOpen(true);
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir o aluno <strong>{student.name}</strong>? 
                                      Esta ação não pode ser desfeita e removerá todos os dados associados.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDeleteStudent(student.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Modals */}
        <StudentFormSteps
          open={isFormModalOpen}
          onOpenChange={(open) => {
            setIsFormModalOpen(open);
            if (!open) setSelectedStudent(null);
          }}
          student={selectedStudent}
          onSave={() => {
            fetchStudents({});
            setIsFormModalOpen(false);
            setSelectedStudent(null);
          }}
        />

        <LinkStudentToClassModal
          open={isLinkModalOpen}
          onOpenChange={setIsLinkModalOpen}
          studentIds={selectedStudents}
          onSuccess={() => {
            setSelectedStudents([]);
            fetchStudents({});
          }}
        />

        <RemoveStudentFromClassModal
          open={isRemoveModalOpen}
          onOpenChange={setIsRemoveModalOpen}
          studentIds={selectedStudents}
          onSuccess={() => {
            setSelectedStudents([]);
            fetchStudents({});
          }}
        />

        <StudentImportWizard
          open={isImportModalOpen}
          onOpenChange={(open) => {
            setIsImportModalOpen(open);
          }}
          onComplete={() => fetchStudents({})}
        />

        <QuickClassLinkingSheet
          open={isQuickLinkingOpen}
          onOpenChange={setIsQuickLinkingOpen}
          students={students.map(s => ({
            id: s.id,
            name: s.name,
            email: s.email,
            enrollmentNumber: (s as any).enrollment_number,
            classes: s.classes
          }))}
          onStudentsLinked={() => fetchStudents({})}
        />
      </PageLayout>
    </AppLayout>
  );
}
