import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, FileDown, FileUp, MoreHorizontal, Edit, Archive, Trash2, Users, Loader2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function TeachersPage() {
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
    
    // Buscar turmas onde o professor é o main_teacher
    const teacherClasses = classes.filter(cls => 
      cls.teachers.includes(teacherId) // teachers é um array com [main_teacher_id]
    );
    
    console.log(`🏫 [TeachersPage] Professor ${teacherId}: ${teacherClasses.length} turma(s)`);
    
    return teacherClasses.map(cls => ({
      id: cls.id,
      name: cls.name,
      code: cls.code || '',
    }));
  };

  const getTeacherPhone = (teacher: any) => {
    // Prioridade 1: Telefones em preferences.teacher.phones (array)
    const phonesArray = teacher.preferences?.teacher?.phones;
    if (phonesArray && phonesArray.length > 0) {
      console.log(`📱 [TeachersPage] Professor ${teacher.name}: telefone de preferences:`, phonesArray[0]);
      return phonesArray[0];
    }
    
    // Prioridade 2: Campo phone direto (fallback)
    if (teacher.phone) {
      console.log(`📱 [TeachersPage] Professor ${teacher.name}: telefone direto:`, teacher.phone);
      return teacher.phone;
    }
    
    console.log(`📱 [TeachersPage] Professor ${teacher.name}: sem telefone`);
    return '-';
  };

  // Determina a rota correta baseada no role do usuário
  const getClassRoute = (classId: string): string => {
    if (!user) return `/secretaria/turmas/${classId}`;
    
    // Professor vê sua própria visualização
    if (user.role === 'professor') {
      return `/professor/turma/${classId}`;
    }
    
    // Secretaria e Admin veem a visualização de gestão
    return `/secretaria/turmas/${classId}`;
  };

  // Handler para abrir modal de turmas
  const handleOpenClassesModal = (teacher: any) => {
    const teacherClasses = getTeacherClasses(teacher.id);
    setSelectedTeacherClasses(teacherClasses);
    setSelectedTeacherName(teacher.name);
    setClassesModalOpen(true);
  };

  // Handler para navegar para turma
  const handleNavigateToClass = (classId: string) => {
    const route = getClassRoute(classId);
    navigate(route);
    setClassesModalOpen(false); // Fechar modal após navegação
  };

  const handleArchiveTeacher = async (id: string) => {
    // Archive functionality not implemented in this version
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

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Professores</h1>
            <p className="text-muted-foreground">Gerenciar cadastro de professores</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportModalOpen(true)}>
              <FileUp className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
            <Button variant="outline" onClick={handleExportCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={openNewTeacherModal}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Professor
            </Button>
          </div>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          </CardContent>
        </Card>

        <TeacherBulkActions 
          selectedTeachers={selectedTeachers}
          onClearSelection={() => setSelectedTeachers([])}
        />

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
                          <Badge variant="default">
                            Ativo
                          </Badge>
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

        <TeacherFormModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open);
            if (!open) {
              setEditingTeacher(null);
              // Refresh the list when modal closes
              fetchTeachers();
            }
          }}
          teacher={editingTeacher}
        />

        <TeacherCSVImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
        />

        {/* Modal de Turmas do Professor */}
        <Dialog open={classesModalOpen} onOpenChange={setClassesModalOpen}>
          <DialogContent className="sm:max-w-[500px] backdrop-blur-xl bg-background/95 border border-white/20 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Turmas de {selectedTeacherName}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {selectedTeacherClasses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma turma encontrada</p>
                </div>
              ) : (
                selectedTeacherClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="group flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/50 transition-all duration-200"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{cls.name}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{cls.code}</p>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => handleNavigateToClass(cls.id)}
                      className="ml-4 gap-2 shrink-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver Turma
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}