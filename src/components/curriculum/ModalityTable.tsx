import { useState } from 'react';
import { useModalityStore } from '@/stores/modality-store';
import { useProgramStore } from '@/stores/program-store';
import { ModalityFilters } from '@/types/curriculum';
import { ModalityFormModal } from './ModalityFormModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Modality } from '@/types/curriculum';

interface ModalityTableProps {
  filters: ModalityFilters;
}

export function ModalityTable({ filters }: ModalityTableProps) {
  const { getFilteredModalities, deleteModality, activateModality, deactivateModality } = useModalityStore();
  const { getProgram } = useProgramStore();
  const { toast } = useToast();
  const [editingModality, setEditingModality] = useState<Modality | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const modalities = getFilteredModalities(filters);

  const handleEdit = (modality: Modality) => {
    setEditingModality(modality);
    setShowEditModal(true);
  };

  const handleDelete = async (modality: Modality) => {
    if (confirm(`Tem certeza que deseja excluir a modalidade "${modality.name}"?`)) {
      try {
        await deleteModality(modality.id);
        toast({ title: 'Modalidade excluída com sucesso!' });
      } catch (error) {
        toast({
          title: 'Erro ao excluir modalidade',
          variant: 'destructive',
        });
      }
    }
  };

  const handleToggleStatus = async (modality: Modality) => {
    try {
      if (modality.isActive) {
        await deactivateModality(modality.id);
        toast({ title: 'Modalidade desativada' });
      } else {
        await activateModality(modality.id);
        toast({ title: 'Modalidade ativada' });
      }
    } catch (error) {
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  if (modalities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma modalidade encontrada.</p>
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
            <TableHead>Programa</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modalities.map((modality) => {
            const program = getProgram(modality.programId);
            
            return (
              <TableRow key={modality.id}>
                <TableCell className="font-medium">{modality.name}</TableCell>
                <TableCell>{modality.code || '-'}</TableCell>
                <TableCell>{program?.name || 'Programa não encontrado'}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {modality.description || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={modality.isActive ? 'default' : 'secondary'}>
                    {modality.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background border shadow-md">
                      <DropdownMenuItem onClick={() => handleEdit(modality)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(modality)}>
                        {modality.isActive ? (
                          <>
                            <ToggleLeft className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <ToggleRight className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(modality)}
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

      <ModalityFormModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setEditingModality(null);
        }}
        modality={editingModality}
      />
    </>
  );
}