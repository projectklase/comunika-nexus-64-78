import { useState } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, MoreVertical, Archive, RotateCcw, Shield, Trash2 } from 'lucide-react';
import { useSecretarias } from '@/hooks/useSecretarias';
import { SecretariaFormModal } from '@/components/admin/SecretariaFormModal';
import { Secretaria } from '@/types/secretaria';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SecretariasPage() {
  const {
    secretarias,
    loading,
    filters,
    setFilters,
    createSecretaria,
    archiveSecretaria,
    reactivateSecretaria,
    deleteSecretaria
  } = useSecretarias();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSecretaria, setSelectedSecretaria] = useState<Secretaria | null>(null);

  const handleArchive = async () => {
    if (!selectedSecretaria) return;
    await archiveSecretaria(selectedSecretaria.id, selectedSecretaria.name);
    setArchiveDialogOpen(false);
    setSelectedSecretaria(null);
  };

  const handleReactivate = async () => {
    if (!selectedSecretaria) return;
    await reactivateSecretaria(selectedSecretaria.id, selectedSecretaria.name);
    setReactivateDialogOpen(false);
    setSelectedSecretaria(null);
  };

  const handleDelete = async () => {
    if (!selectedSecretaria) return;
    await deleteSecretaria(selectedSecretaria.id, selectedSecretaria.name);
    setDeleteDialogOpen(false);
    setSelectedSecretaria(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const activeCount = secretarias.filter(s => s.is_active).length;
  const inactiveCount = secretarias.filter(s => !s.is_active).length;

  return (
    <AppLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Gerenciar Secretarias
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie usuários com acesso administrativo à secretaria
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Secretaria
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{secretarias.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{activeCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">{inactiveCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Busque e filtre as secretarias cadastradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filters.status === 'all' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, status: 'all' })}
                >
                  Todos
                </Button>
                <Button
                  variant={filters.status === 'active' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, status: 'active' })}
                >
                  Ativos
                </Button>
                <Button
                  variant={filters.status === 'inactive' ? 'default' : 'outline'}
                  onClick={() => setFilters({ ...filters, status: 'inactive' })}
                >
                  Inativos
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Secretarias</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : secretarias.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma secretaria encontrada
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {secretarias.map((secretaria) => (
                    <TableRow key={secretaria.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={secretaria.avatar} />
                            <AvatarFallback>{getInitials(secretaria.name)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{secretaria.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{secretaria.email}</TableCell>
                      <TableCell>{secretaria.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={secretaria.is_active ? 'default' : 'secondary'}>
                          {secretaria.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(secretaria.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {secretaria.is_active ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSecretaria(secretaria);
                                  setArchiveDialogOpen(true);
                                }}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Arquivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSecretaria(secretaria);
                                  setReactivateDialogOpen(true);
                                }}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSecretaria(secretaria);
                                setDeleteDialogOpen(true);
                              }}
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
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <SecretariaFormModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={createSecretaria}
        />

        {/* Archive Dialog */}
        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arquivar Secretaria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja arquivar <strong>{selectedSecretaria?.name}</strong>?
                O usuário não poderá mais fazer login no sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>Arquivar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Dialog */}
        <AlertDialog open={reactivateDialogOpen} onOpenChange={setReactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reativar Secretaria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja reativar <strong>{selectedSecretaria?.name}</strong>?
                O usuário poderá fazer login novamente no sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReactivate}>Reativar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Secretária?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente <strong>{selectedSecretaria?.name}</strong>?
                Esta ação não pode ser desfeita e removerá todos os dados associados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
