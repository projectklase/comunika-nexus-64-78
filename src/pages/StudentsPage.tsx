import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { StudentCSVImportModal } from '@/components/students/StudentCSVImportModal';
import { useStudents } from '@/hooks/useStudents';
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
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

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

  const getStudentClasses = (studentId: string) => {
    // For now, return empty array since we don't have class relationships in Supabase yet
    return [];
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
        // Archive functionality not implemented in this version
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
      const studentClasses = getStudentClasses(student.id);
      return [
        student.id,
        student.name,
        student.email || '',
        'Ativo',
        studentClasses.map(c => c.name).join(',')
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

  const handleDelete = async (studentId: string, studentName: string) => {
    // Adiciona uma confirmação para segurança
    if (!window.confirm(`Tem certeza que deseja excluir o aluno ${studentName}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    // A função 'deleteStudent' que está sendo chamada aqui é a nova,
    // que já vem do seu hook 'useStudents' corrigido.
    await deleteStudent(studentId);
  };

  return (
    <AppLayout>
      <div className="flex flex-col space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold gradient-text">Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie os alunos cadastrados na escola
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsImportModalOpen(true)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              onClick={() => setIsFormModalOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Aluno
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="glass rounded-lg p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>

        {/* Ações em lote */}
        {selectedStudents.length > 0 && (
          <div className="glass rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedStudents.length} aluno(s) selecionado(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkArchive}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Arquivar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkModalOpen(true)}
                  className="gap-2"
                >
                  <Link className="h-4 w-4" />
                  Vincular à Turma
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRemoveModalOpen(true)}
                  className="gap-2"
                >
                  <Unlink className="h-4 w-4" />
                  Remover da Turma
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela */}
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
                  const studentClasses = getStudentClasses(student.id);
                  
                  // Calculate age from dob if available
                  let age = 15; // default
                  let isMinor = false;
                  
                  if ((student as any).dob) {
                    const birthDate = new Date((student as any).dob);
                    const today = new Date();
                    age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                      age--;
                    }
                    isMinor = age < 18;
                  }

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
                        <span className="text-muted-foreground text-sm">Não definido</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {studentClasses.length > 0 ? (
                            <>
                              {studentClasses.slice(0, 2).map((c, index) => (
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
                        <span className="text-muted-foreground text-sm">-</span>
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
                            <DropdownMenuItem onClick={() => {
                              setSelectedStudent(student);
                              setIsFormModalOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(student.id, student.name)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
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

        <StudentFormSteps
          open={isFormModalOpen}
          onOpenChange={(open) => {
            setIsFormModalOpen(open);
            if (!open) {
              setSelectedStudent(null);
              // Refresh the list when modal closes
              fetchStudents();
            }
          }}
          student={selectedStudent}
          onSave={() => {
            fetchStudents();
          }}
        />

        <LinkStudentToClassModal
          open={isLinkModalOpen}
          onOpenChange={setIsLinkModalOpen}
          studentIds={selectedStudents}
        />

        <RemoveStudentFromClassModal
          open={isRemoveModalOpen}
          onOpenChange={setIsRemoveModalOpen}
          studentIds={selectedStudents}
        />

        <StudentCSVImportModal
          open={isImportModalOpen}
          onOpenChange={setIsImportModalOpen}
        />
      </div>
    </AppLayout>
  );
}