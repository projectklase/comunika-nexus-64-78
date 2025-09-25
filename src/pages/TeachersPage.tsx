import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { useGlobalSubjectStore } from '@/stores/global-subject-store';
import { TeacherFormModal } from '@/components/teachers/TeacherFormModal';
import { TeacherCSVImportModal } from '@/components/teachers/TeacherCSVImportModal';
import { TeacherBulkActions } from '@/components/teachers/TeacherBulkActions';
import { useTeacherExport } from '@/hooks/useTeacherExport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, FileDown, FileUp, MoreHorizontal, Edit, Archive, Trash2, Users } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Person } from '@/types/class';
import { useToast } from '@/hooks/use-toast';

export default function TeachersPage() {
  const { listTeachers, archiveTeacher, deletePerson, loadPeople } = usePeopleStore();
  const { classes, loadClasses } = useClassStore();
  const { loadSubjects } = useGlobalSubjectStore();
  const { exportTeachersCSV } = useTeacherExport();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Person | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedTeachers, setSelectedTeachers] = useState<Person[]>([]);

  useEffect(() => {
    loadPeople();
    loadClasses();
    loadSubjects();
  }, [loadPeople, loadClasses, loadSubjects]);

  const activeClasses = classes.filter(c => c.status === 'ATIVA');

  const getFilteredTeachers = () => {
    const filters: any = {};
    
    if (searchQuery) filters.query = searchQuery;
    if (statusFilter !== 'all') filters.active = statusFilter === 'active';
    if (classFilter !== 'all') filters.classId = classFilter;
    
    let teachers = listTeachers(filters);
    
    // Day filter (optional)
    if (dayFilter !== 'all') {
      teachers = teachers.filter(t => 
        t.teacher?.availability?.daysOfWeek?.includes(dayFilter)
      );
    }
    
    return teachers;
  };

  const teachers = getFilteredTeachers();

  const getTeacherClasses = (teacherId: string) => {
    return classes.filter(c => c.teachers.includes(teacherId) && c.status === 'ATIVA');
  };

  const getTeacherPhone = (teacher: any) => {
    return teacher.teacher?.phones?.[0] || '-';
  };

  const handleArchiveTeacher = async (id: string) => {
    await archiveTeacher(id);
  };

  const handleDeleteTeacher = async (id: string) => {
    await deletePerson(id);
  };

  const handleExportCSV = () => {
    const filteredTeachers = getFilteredTeachers();
    const filename = exportTeachersCSV(filteredTeachers);
    toast({
      title: "Exportação concluída",
      description: `Arquivo ${filename} baixado com sucesso.`,
    });
  };

  const handleSelectTeacher = (teacher: Person, checked: boolean) => {
    if (checked) {
      setSelectedTeachers(prev => [...prev, teacher]);
    } else {
      setSelectedTeachers(prev => prev.filter(t => t.id !== teacher.id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTeachers(teachers);
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

  const openEditTeacherModal = (teacher: Person) => {
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
                    {activeClasses.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.code && `(${c.code})`}
                      </SelectItem>
                    ))}
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
                      checked={teachers.length > 0 && selectedTeachers.length === teachers.length}
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
                {teachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum professor encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  teachers.map((teacher) => {
                    const teacherClasses = getTeacherClasses(teacher.id);
                    return (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <Checkbox
                            checked={isTeacherSelected(teacher.id)}
                            onCheckedChange={(checked) => handleSelectTeacher(teacher, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>{teacher.teacher?.email || teacher.email || '-'}</TableCell>
                        <TableCell>{getTeacherPhone(teacher)}</TableCell>
                        <TableCell>
                          {teacherClasses.length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="cursor-pointer">
                                    <Users className="h-3 w-3 mr-1" />
                                    {teacherClasses.length}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1">
                                    {teacherClasses.map(c => (
                                      <div key={c.id}>{c.name} {c.code && `(${c.code})`}</div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={teacher.isActive ? "default" : "secondary"}>
                            {teacher.isActive ? 'Ativo' : 'Arquivado'}
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
                                {teacher.isActive ? 'Arquivar' : 'Desarquivar'}
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
          onOpenChange={closeModal}
          teacher={editingTeacher}
        />

        <TeacherCSVImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
        />
      </div>
    </AppLayout>
  );
}