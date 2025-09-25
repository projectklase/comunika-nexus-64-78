import { useState } from 'react';
import { useClassStore } from '@/stores/class-store';
import { usePeopleStore } from '@/stores/people-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Search, UserPlus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddStudentsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
}

export function AddStudentsDrawer({ 
  open, 
  onOpenChange, 
  classId 
}: AddStudentsDrawerProps) {
  const { toast } = useToast();
  const { addStudents } = useClassStore();
  const { getStudents, createPerson, importStudents } = usePeopleStore();
  
  // Tab 1: Select existing students
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  
  // Tab 2: Quick add
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  
  // Tab 3: Import
  const [importData, setImportData] = useState('');

  const students = getStudents();
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    setSelectedStudents(prev =>
      checked
        ? [...prev, studentId]
        : prev.filter(id => id !== studentId)
    );
  };

  const handleAddSelected = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: "Nenhum aluno selecionado",
        description: "Selecione pelo menos um aluno para adicionar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await addStudents(classId, selectedStudents);
      toast({
        title: "Alunos adicionados",
        description: `${selectedStudents.length} aluno(s) foram adicionados à turma.`,
      });
      setSelectedStudents([]);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar os alunos.",
        variant: "destructive",
      });
    }
  };

  const handleQuickAdd = async () => {
    if (!quickName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do aluno.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newStudent = await createPerson({
        name: quickName.trim(),
        email: quickEmail.trim() || undefined,
        role: 'ALUNO',
        isActive: true
      });

      await addStudents(classId, [newStudent.id]);
      
      toast({
        title: "Aluno adicionado",
        description: `${newStudent.name} foi adicionado à turma.`,
      });
      
      setQuickName('');
      setQuickEmail('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o aluno.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      toast({
        title: "Dados obrigatórios",
        description: "Cole os dados dos alunos para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const newStudents = await importStudents(importData.trim());
      const studentIds = newStudents.map(s => s.id);
      
      await addStudents(classId, studentIds);
      
      toast({
        title: "Alunos importados",
        description: `${newStudents.length} aluno(s) foram importados e adicionados à turma.`,
      });
      
      setImportData('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível importar os alunos.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="glass-card w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="gradient-text">Adicionar Alunos</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="existing" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 glass-button">
            <TabsTrigger value="existing">Existentes</TabsTrigger>
            <TabsTrigger value="quick">Rápido</TabsTrigger>
            <TabsTrigger value="import">Importar</TabsTrigger>
          </TabsList>

          {/* Tab 1: Select existing students */}
          <TabsContent value="existing" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alunos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 glass-input"
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <Checkbox
                    checked={selectedStudents.includes(student.id)}
                    onCheckedChange={(checked) => 
                      handleSelectStudent(student.id, checked as boolean)
                    }
                  />
                  <div className="flex-1">
                    <div className="font-medium">{student.name}</div>
                    {student.email && (
                      <div className="text-sm text-muted-foreground">
                        {student.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  {search ? 'Nenhum aluno encontrado.' : 'Nenhum aluno disponível.'}
                </div>
              )}
            </div>

            <Button 
              onClick={handleAddSelected} 
              disabled={selectedStudents.length === 0}
              className="w-full glass-button"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Selecionados ({selectedStudents.length})
            </Button>
          </TabsContent>

          {/* Tab 2: Quick add */}
          <TabsContent value="quick" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="quick-name">Nome *</Label>
                <Input
                  id="quick-name"
                  placeholder="Nome do aluno"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="glass-input"
                />
              </div>

              <div>
                <Label htmlFor="quick-email">E-mail (opcional)</Label>
                <Input
                  id="quick-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={quickEmail}
                  onChange={(e) => setQuickEmail(e.target.value)}
                  className="glass-input"
                />
              </div>

              <Button 
                onClick={handleQuickAdd} 
                disabled={!quickName.trim()}
                className="w-full glass-button"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Adicionar Aluno
              </Button>
            </div>
          </TabsContent>

          {/* Tab 3: Import */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-data">Dados dos Alunos</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Cole uma linha por aluno no formato: Nome;email (e-mail é opcional)
                </p>
                <Textarea
                  id="import-data"
                  placeholder={`João Silva;joao@email.com\nMaria Santos\nPedro Oliveira;pedro@email.com`}
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="glass-input h-32"
                />
              </div>

              <Button 
                onClick={handleImport} 
                disabled={!importData.trim()}
                className="w-full glass-button"
              >
                <Upload className="h-4 w-4 mr-2" />
                Importar Alunos
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}