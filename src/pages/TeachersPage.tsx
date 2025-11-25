import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { PageLayout } from '@/components/ui/page-layout';
import { TeacherFormModal } from '@/components/teachers/TeacherFormModal';
import { TeacherCSVImportModal } from '@/components/teachers/TeacherCSVImportModal';
import { TeacherBulkActions } from '@/components/teachers/TeacherBulkActions';
import { useTeachers } from '@/hooks/useTeachers';
import { useClasses } from '@/hooks/useClasses';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, FileDown, FileUp, MoreHorizontal, Edit, Archive, Trash2, Users, Loader2, Eye, Filter } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { RESPONSIVE_CLASSES } from '@/lib/responsive-utils';
import { cn } from '@/lib/utils';

export default function TeachersPage() {
  const isMobile = useIsMobile();
  const { 
    teachers,
    loading,
    fetchTeachers,
    deleteTeacher: deleteTeacherHook,
  } = useTeachers();
  const { classes } = useClasses();
  const { currentSchool } = useSchool();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<any[]>([]);
  const [classesModalOpen, setClassesModalOpen] = useState(false);
  const [selectedTeacherClasses, setSelectedTeacherClasses] = useState<any[]>([]);
  const [selectedTeacherName, setSelectedTeacherName] = useState('');

  // Apply filters when they change
  useEffect(() => {
    const filters = {
      search: searchQuery || undefined,
      status: statusFilter !== 'all' ? statusFilter as 'active' | 'archived' : undefined,
      class_id: classFilter !== 'all' ? classFilter : undefined,
      day: dayFilter !== 'all' ? dayFilter : undefined,
    };
    
    fetchTeachers(filters);
  }, [searchQuery, statusFilter, classFilter, dayFilter, fetchTeachers]);

  const filteredTeachers = teachers;

  const getTeacherClasses = (teacherId: string) => {
    if (!classes || classes.length === 0) {
      return [];
    }
    
    const teacherClasses = classes.filter(cls => 
      cls.teachers.includes(teacherId)
    );
    
    return teacherClasses.map(cls => ({
      id: cls.id,
      name: cls.name,
      code: cls.code || '',
    }));
  };

  const getTeacherPhone = (teacher: any) => {
    const phonesArray = teacher.preferences?.teacher?.phones;
    if (phonesArray && phonesArray.length > 0) {
      return phonesArray[0];
    }
    
    if (teacher.phone) {
      return teacher.phone;
    }
    
    return '-';
  };

  const getClassRoute = (classId: string): string => {
    if (!user) return `/secretaria/turmas/${classId}`;
    
    if (user.role === 'professor') {
      return `/professor/turma/${classId}`;
    }
    
    return `/secretaria/turmas/${classId}`;
  };

  const handleOpenClassesModal = (teacher: any) => {
    const teacherClasses = getTeacherClasses(teacher.id);
    setSelectedTeacherClasses(teacherClasses);
    setSelectedTeacherName(teacher.name);
    setClassesModalOpen(true);
  };

  const handleNavigateToClass = (classId: string) => {
    const route = getClassRoute(classId);
    navigate(route);
    setClassesModalOpen(false);
  };

  const handleArchiveTeacher = async (id: string) => {
    console.log('Archive teacher:', id);
  };

  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteTeacherHook(id);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleExportCSV = () => {
    const csvData = filteredTeachers.map(teacher => {
      return [
        teacher.id,
        teacher.name,
        teacher.email || '',
        getTeacherPhone(teacher),
        'Ativo'
      ].join(';');
    }).join('\n');

    const header = 'professor_id;nome;email;telefone;status\n';
    const blob = new Blob([header + csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    a.download = `professores_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: `Arquivo baixado com sucesso.`,
    });
  };

  const handleSelectTeacher = (teacher: any, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacher]);
    } else {
      setSelectedTeachers(prev => prev.filter(t => t.id !== teacher.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(filteredTeachers);
    } else {
      setSelectedTeachers([]);
    }
  };

  const isTeacherSelected = (teacherId: string) => {
    return selectedTeachers.some(t => t.id === teacherId);
  };

  const openNewTeacherModal = () => {
    setEditingTeacher(null);
    setModalOpen(true);
  };

  const openEditTeacherModal = (teacher: any) => {
    setEditingTeacher(teacher);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingTeacher(null);
  };

  const daysOfWeek = [
    { value: 'Segunda', label: 'Segunda' },
    { value: 'Terça', label: 'Terça' },
    { value: 'Quarta', label: 'Quarta' },
    { value: 'Quinta', label: 'Quinta' },
    { value: 'Sexta', label: 'Sexta' },
    { value: 'Sábado', label: 'Sábado' },
    { value: 'Domingo', label: 'Domingo' },
  ];

  // Header Actions Component
  const HeaderActions = () => (
    <>
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={() => setImportModalOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <FileUp className="h-4 w-4" />
        <span className="ml-2">Importar</span>
      </Button>
      <Button 
        variant="outline" 
        size={isMobile ? "sm" : "default"}
        onClick={handleExportCSV}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <FileDown className="h-4 w-4" />
        <span className="ml-2">Exportar</span>
      </Button>
      <Button 
        size={isMobile ? "sm" : "default"}
        onClick={openNewTeacherModal}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Plus className="h-4 w-4" />
        <span className="ml-2">Novo Professor</span>
      </Button>
    </>
  );

  // Filters Content Component
  const FiltersContent = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Buscar</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome ou e-mail"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
            <SelectItem value="inactive">Arquivado</SelectItem>
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
        <label className="text-sm font-medium">Dia da Semana</label>
        <Select value={dayFilter} onValueChange={setDayFilter}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {daysOfWeek.map(day => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Mobile Filters Sheet Component
  const MobileFiltersSheet = () => {
    const activeFiltersCount = [statusFilter, classFilter, dayFilter]
      .filter(f => f !== 'all').length + (searchQuery ? 1 : 0);

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
            <SheetTitle>Filtrar Professores</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Render Teacher Card for Mobile
  const renderTeacherCard = (teacher: any) => {
    const teacherClasses = getTeacherClasses(teacher.id);
    
    return (
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isTeacherSelected(teacher.id)}
              onCheckedChange={(checked) => handleSelectTeacher(teacher, checked as boolean)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{teacher.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{teacher.email || '-'}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditTeacherModal(teacher)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchiveTeacher(teacher.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Arquivar
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
                      Tem certeza que deseja excluir o professor "{teacher.name}"? 
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeleteTeacher(teacher.id)}
                      className="bg-destructive hover:bg-destructive/90"
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
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Telefone:</span>
            <span>{getTeacherPhone(teacher)}</span>
          </div>
          
          {teacherClasses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground">Turmas:</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleOpenClassesModal(teacher)}
                className="h-8 gap-1"
              >
                <Eye className="h-4 w-4" />
                {teacherClasses.length}
              </Button>
            </div>
          )}
          
          <Badge variant="default">Ativo</Badge>
        </div>
      </CardContent>
    );
  };

  return (
    <AppLayout>
      <PageLayout
        title="Professores"
        subtitle="Gerenciar cadastro de professores"
        actions={<HeaderActions />}
        filters={
          <div className="glass rounded-lg p-4">
            <FiltersContent />
          </div>
        }
        mobileFilters={<MobileFiltersSheet />}
      >
        <TeacherBulkActions 
          selectedTeachers={selectedTeachers}
          onClearSelection={() => setSelectedTeachers([])}
        />
        
        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Carregando professores...</span>
              </div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Nenhum professor encontrado
              </div>
            ) : (
              filteredTeachers.map((teacher) => (
                <Card key={teacher.id} className="glass-card">
                  {renderTeacherCard(teacher)}
                </Card>
              ))
            )}
          </div>
        ) : (
          <Card className="glass">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={filteredTeachers.length > 0 && selectedTeachers.length === filteredTeachers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Turmas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Carregando professores...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredTeachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum professor encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTeachers.map((teacher) => {
                      const teacherClasses = getTeacherClasses(teacher.id);
                      return (
                        <TableRow key={teacher.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTeachers.some(t => t.id === teacher.id)}
                              onCheckedChange={(checked) => handleSelectTeacher(teacher, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{teacher.name}</TableCell>
                          <TableCell>{teacher.email || '-'}</TableCell>
                          <TableCell>{getTeacherPhone(teacher)}</TableCell>
                          <TableCell>
                            {teacherClasses.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenClassesModal(teacher)}
                                className="h-8 gap-2 hover:bg-accent"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                                <span className="text-sm font-medium">{teacherClasses.length}</span>
                              </Button>
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
                                <DropdownMenuItem onClick={() => openEditTeacherModal(teacher)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleArchiveTeacher(teacher.id)}>
                                  <Archive className="h-4 w-4 mr-2" />
                                  Arquivar
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
                                        Tem certeza que deseja excluir o professor "{teacher.name}"? 
                                        Esta ação não pode ser desfeita.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteTeacher(teacher.id)}
                                        className="bg-destructive hover:bg-destructive/90"
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
            </CardContent>
          </Card>
        )}

        <TeacherFormModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setEditingTeacher(null);
            }
          }}
          teacher={editingTeacher}
        />

        <TeacherCSVImportModal
          open={importModalOpen}
          onOpenChange={(open) => {
            setImportModalOpen(open);
            if (!open) {
              fetchTeachers({});
            }
          }}
        />

        <Dialog open={classesModalOpen} onOpenChange={setClassesModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Turmas de {selectedTeacherName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              {selectedTeacherClasses.length === 0 ? (
                <p className="text-muted-foreground">Este professor não está vinculado a nenhuma turma.</p>
              ) : (
                selectedTeacherClasses.map((cls) => (
                  <Button
                    key={cls.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleNavigateToClass(cls.id)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {cls.name} {cls.code && `(${cls.code})`}
                  </Button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </AppLayout>
  );
}
