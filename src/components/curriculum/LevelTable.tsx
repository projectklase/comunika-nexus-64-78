import { useState } from 'react';
import { useLevels } from '@/hooks/useLevels';
import { useProgramStore } from '@/stores/program-store';
import { LevelFormModal } from './LevelFormModal';
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

interface LevelTableProps {
  filters: { search?: string; isActive?: boolean };
}

export function LevelTable({ filters }: LevelTableProps) {
  const { toast } = useToast();
  const { levels, getFilteredLevels, deleteLevel, updateLevel } = useLevels();
  const { getProgram } = useProgramStore();
  const [editingLevel, setEditingLevel] = useState<any>(null);

  const filteredLevels = getFilteredLevels(filters);

  const handleDelete = async (level: any) => {
    if (confirm(`Tem certeza que deseja excluir o nível "${level.name}"?`)) {
      try {
        await deleteLevel(level.id);
        toast({
          title: "Nível excluído",
          description: "O nível foi excluído com sucesso.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o nível.",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (level: any) => {
    try {
      await updateLevel(level.id, { is_active: !level.is_active });
      toast({
        title: level.is_active ? "Nível desativado" : "Nível ativado",
        description: level.is_active ? "O nível foi desativado com sucesso." : "O nível foi ativado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do nível.",
        variant: "destructive",
      });
    }
  };

  if (filteredLevels.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Nenhum nível encontrado.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Programa</TableHead>
            <TableHead>Ordem</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLevels.map((level) => {
            const program = getProgram(level.id);
            return (
              <TableRow key={level.id}>
                <TableCell className="font-medium">{level.name}</TableCell>
                <TableCell>{program?.name || 'N/A'}</TableCell>
                <TableCell>{level.display_order || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">
                  {level.description || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={level.is_active ? 'default' : 'secondary'}>
                    {level.is_active ? 'Ativo' : 'Inativo'}
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
                      <DropdownMenuItem onClick={() => setEditingLevel(level)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(level)}>
                        {level.is_active ? (
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
                        onClick={() => handleDelete(level)}
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

      <LevelFormModal
        open={!!editingLevel}
        onOpenChange={(open) => !open && setEditingLevel(null)}
        level={editingLevel}
      />
    </>
  );
}