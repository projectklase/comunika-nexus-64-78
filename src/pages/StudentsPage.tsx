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
import { usePeopleStore } from '@/stores/people-store';
import { useClassStore } from '@/stores/class-store';
import { useProgramStore } from '@/stores/program-store';
import { useLevelStore } from '@/stores/level-store';
import { Person } from '@/types/class';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Archive,
  Link,
  Unlink,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
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
  const [selectedStudent, setSelectedStudent] = useState<Person | null>(null);

  const { 
    people, 
    loadPeople, 
    deletePerson, 
    archivePerson 
  } = usePeopleStore();
  
  const { classes, loadClasses } = useClassStore();
  const { programs, loadPrograms } = useProgramStore();
  const { levels, loadLevels } = useLevelStore();

  useEffect(() => {
    loadPeople();
    loadClasses();
    loadPrograms();
    loadLevels();
  }, [loadPeople, loadClasses, loadPrograms, loadLevels]);

  // Filter students locally to avoid require() dependency issues
  const filteredStudents = people.filter(person => {
    if (person.role !== 'ALUNO') return false;
    
    // Search filter
    if (search && !person.name.toLowerCase().includes(search.toLowerCase()) &&
        !person.student?.email?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    // Status filter
    if (statusFilter === 'active' && !person.isActive) return false;
    if (statusFilter === 'archived' && person.isActive) return false;
    
    // Age filter
    if (statusFilter === 'minor' || statusFilter === 'adult') {
      const age = person.student?.dob ? 
        Math.floor((new Date().getTime() - new Date(person.student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 
        null;
      
      if (statusFilter === 'minor' && (age === null || age >= 18)) return false;
      if (statusFilter === 'adult' && (age === null || age < 18)) return false;
    }
    
    // Class filter
    if (classFilter !== 'all') {
      const studentClasses = classes.filter(c => c.students.includes(person.id));
      if (!studentClasses.some(c => c.id === classFilter)) return false;
    }
    
    // Program filter
    if (programFilter !== 'all') {
      if (person.student?.programId !== programFilter) return false;
    }
    
    // Level filter
    if (levelFilter !== 'all') {
      if (person.student?.levelId !== levelFilter) return false;
    }
    
    return true;
  });

  const getStudentClasses = (studentId: string) => {
    return classes.filter(c => c.students.includes(studentId));
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
        await archivePerson(studentId);
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
        student.isActive ? 'Ativo' : 'Arquivado',
        studentClasses.map(c => c.code || c.name).join(',')
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

  const handleDelete = async (studentId: string) => {
    try {
      await deletePerson(studentId);
      toast.success('Aluno removido com sucesso');
    } catch (error) {
      toast.error('Erro ao remover aluno');
    }
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
                  {classes.filter(c => c.status === 'ATIVA').map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
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
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nível</label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {levels.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Faixa Etária</label>
              <Select value={statusFilter === 'minor' || statusFilter === 'adult' ? statusFilter : 'all'} onValueChange={(value) => {
                if (value === 'minor' || value === 'adult') {
                  setStatusFilter(value);
                } else {
                  setStatusFilter('all');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="minor">Menores</SelectItem>
                  <SelectItem value="adult">Adultos</SelectItem>
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
              {filteredStudents.map((student) => {
                const studentClasses = getStudentClasses(student.id);
                
                // Calculate age
                const age = student.student?.dob ? 
                  Math.floor((new Date().getTime() - new Date(student.student.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : 
                  null;

                // Get program and level names
                const program = student.student?.programId ? 
                  programs.find(p => p.id === student.student.programId) : null;
                const level = student.student?.levelId ? 
                  levels.find(l => l.id === student.student.levelId) : null;

                // Get primary guardian
                const primaryGuardian = student.student?.guardians?.find(g => g.isPrimary);

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
                      {age !== null ? (
                        <div className="flex items-center gap-2">
                          <span>{age} anos</span>
                          {age < 18 && <Badge variant="outline" className="text-xs">Menor</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {program && level ? (
                        <div className="text-sm">
                          <div className="font-medium">{program.name}</div>
                          <div className="text-muted-foreground">{level.name}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não definido</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {studentClasses.length > 0 ? (
                          <>
                            {studentClasses.slice(0, 2).map((c) => (
                              <Badge key={c.id} variant="secondary" className="text-xs">
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
                      {primaryGuardian ? (
                        <div className="text-sm">
                          <div className="font-medium">{primaryGuardian.name}</div>
                          <div className="text-muted-foreground">{primaryGuardian.phone}</div>
                        </div>
                      ) : age !== null && age < 18 ? (
                        <span className="text-orange-600 text-sm">Sem responsável</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.isActive ? 'default' : 'secondary'}>
                        {student.isActive ? 'Ativo' : 'Arquivado'}
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
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(student);
                              setIsFormModalOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(student.id)}
                            className="text-destructive"
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
        </div>
      </div>

      {/* Modais */}
      <StudentFormSteps
        open={isFormModalOpen}
        onOpenChange={(open) => {
          setIsFormModalOpen(open);
          if (!open) setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      <StudentCSVImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
      />

      <LinkStudentToClassModal
        open={isLinkModalOpen}
        onOpenChange={setIsLinkModalOpen}
        studentIds={selectedStudents}
        onSuccess={() => setSelectedStudents([])}
      />

      <RemoveStudentFromClassModal
        open={isRemoveModalOpen}
        onOpenChange={setIsRemoveModalOpen}
        studentIds={selectedStudents}
        onSuccess={() => setSelectedStudents([])}
      />
    </AppLayout>
  );
}