import { useState } from 'react';
import { useGlobalSubjectStore, GlobalSubject, GlobalSubjectFilters } from '@/stores/global-subject-store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CatalogoSubjectFormModal } from './CatalogoSubjectFormModal';

interface CatalogoSubjectsTableProps {
  filters: GlobalSubjectFilters;
}

export function CatalogoSubjectsTable({ filters }: CatalogoSubjectsTableProps) {
  const { toast } = useToast();
  const { getFilteredSubjects, deleteSubject, activateSubject, deactivateSubject } = useGlobalSubjectStore();
  const [editingSubject, setEditingSubject] = useState<GlobalSubject | null>(null);

  const subjects = getFilteredSubjects(filters);

  const handleDelete = async (subject: GlobalSubject) => {
    if (confirm(`Tem certeza que deseja excluir a matéria "${subject.name}"?`)) {
      try {
        await deleteSubject(subject.id);
        toast({ title: "Matéria excluída", description: "A matéria foi excluída com sucesso." });
      } catch (error) {
        toast({ title: "Erro", description: "Não foi possível excluir a matéria.", variant: "destructive" });
      }
    }
  };

  const handleToggleStatus = async (subject: GlobalSubject) => {
    try {
      if (subject.isActive) {
        await deactivateSubject(subject.id);
        toast({ title: "Matéria desativada", description: "A matéria foi desativada com sucesso." });
      } else {
        await activateSubject(subject.id);
        toast({ title: "Matéria ativada", description: "A matéria foi ativada com sucesso." });
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível alterar o status da matéria.", variant: "destructive" });
    }
  };

  if (subjects.length === 0) {
    return <div className="text-center py-8"><p className="text-muted-foreground">Nenhuma matéria encontrada.</p></div>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell className="font-medium">{subject.name}</TableCell>
              <TableCell>{subject.code || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">{subject.description || '-'}</TableCell>
              <TableCell>
                <Badge variant={subject.isActive ? 'default' : 'secondary'}>
                  {subject.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuItem onClick={() => setEditingSubject(subject)}>
                      <Edit className="mr-2 h-4 w-4" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(subject)}>
                      {subject.isActive ? <><Archive className="mr-2 h-4 w-4" />Desativar</> : <><ArchiveRestore className="mr-2 h-4 w-4" />Ativar</>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(subject)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CatalogoSubjectFormModal open={!!editingSubject} onOpenChange={(open) => !open && setEditingSubject(null)} subject={editingSubject} />
    </>
  );
}