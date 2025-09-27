import { useState } from 'react';
import { usePrograms } from '@/hooks/usePrograms';
import { Program, ProgramFilters } from '@/types/curriculum';
import { ProgramFormModal } from './ProgramFormModal';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProgramTableProps {
  filters: ProgramFilters;
}

export function ProgramTable({ filters }: ProgramTableProps) {
  const { toast } = useToast();
  const { 
    getFilteredPrograms, 
    deleteProgram, 
    updateProgram,
    loading
  } = usePrograms();
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const programs = getFilteredPrograms(filters);

  const handleDelete = async (program: Program) => {
    if (confirm(`Tem certeza que deseja excluir o programa "${program.name}"?`)) {
      try {
        await deleteProgram(program.id);
        toast({
          title: "Programa excluído",
          description: "O programa foi excluído com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o programa.",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (program: Program) => {
    try {
      await updateProgram(program.id, { isActive: !program.isActive });
      toast({
        title: program.isActive ? "Programa desativado" : "Programa ativado",
        description: `O programa foi ${program.isActive ? 'desativado' : 'ativado'} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do programa.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Carregando programas...</p>
      </div>
    );
  }

  if (programs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum programa encontrado.</p>
      </div>
    );
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
          {programs.map((program) => (
            <TableRow key={program.id}>
              <TableCell className="font-medium">{program.name}</TableCell>
              <TableCell>{program.code || '-'}</TableCell>
              <TableCell className="max-w-xs truncate">
                {program.description || '-'}
              </TableCell>
              <TableCell>
                <Badge variant={program.isActive ? 'default' : 'secondary'}>
                  {program.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card">
                    <DropdownMenuItem onClick={() => setEditingProgram(program)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleStatus(program)}>
                      {program.isActive ? (
                        <>
                          <Archive className="mr-2 h-4 w-4" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(program)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ProgramFormModal
        open={!!editingProgram}
        onOpenChange={(open) => !open && setEditingProgram(null)}
        program={editingProgram}
      />
    </>
  );
}