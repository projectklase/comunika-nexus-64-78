import { useState } from 'react';
import { useModalities } from '@/hooks/useModalities';
import { useProgramStore } from '@/stores/program-store';
import { ModalityFormModal } from './ModalityFormModal';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Modality } from '@/types/curriculum';

interface ModalityTableProps {
  filters: { search?: string; isActive?: boolean };
}

export function ModalityTable({ filters }: ModalityTableProps) {
  const { modalities, getFilteredModalities, deleteModality, updateModality } = useModalities();
  const { getProgram } = useProgramStore();
  const { toast } = useToast();
  const [editingModality, setEditingModality] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const filtered = getFilteredModalities(filters);

  const handleEdit = (modality: any) => {
    setEditingModality(modality);
    setShowEditModal(true);
  };

  const handleDelete = async (modality: any) => {
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

  const handleToggleStatus = async (modality: any) => {
    try {
      await updateModality(modality.id, { is_active: !modality.is_active });
      toast({ title: modality.is_active ? 'Modalidade desativada' : 'Modalidade ativada' });
    } catch (error) {
      toast({
        title: 'Erro ao alterar status',
        variant: 'destructive',
      });
    }
  };

  if (filtered.length === 0) {
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
          {filtered.map((modality) => {
            const program = getProgram(modality.id);
            
            return (
              <TableRow key={modality.id}>
                <TableCell className="font-medium">{modality.name}</TableCell>
                <TableCell>{modality.code || '-'}</TableCell>
                <TableCell>{program?.name || 'Programa não encontrado'}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {modality.description || '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={modality.is_active ? 'default' : 'secondary'}>
                    {modality.is_active ? 'Ativo' : 'Inativo'}
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
                        {modality.is_active ? (
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