import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/Layout/AppLayout';
import { PageLayout } from '@/components/ui/page-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
import { Plus, Search, MoreVertical, Archive, RotateCcw, Trash2, Edit, Key, Filter, Shield } from 'lucide-react';
import { useSecretarias } from '@/hooks/useSecretarias';
import { SecretariaFormModal } from '@/components/admin/SecretariaFormModal';
import { SecretariaPermissionsModal } from '@/components/admin/SecretariaPermissionsModal';
import { PermissionsDashboard } from '@/components/admin/PermissionsDashboard';
import { Secretaria } from '@/types/secretaria';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSecretariaPermissions } from '@/hooks/useSecretariaPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { RESPONSIVE_CLASSES } from '@/lib/responsive-utils';
import { cn } from '@/lib/utils';

export default function SecretariasPage() {
  const isMobile = useIsMobile();
  const {
    secretarias,
    loading,
    filters,
    setFilters,
    createSecretaria,
    updateSecretaria,
    archiveSecretaria,
    reactivateSecretaria,
    deleteSecretaria
  } = useSecretarias();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [reactivateDialogOpen, setReactivateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);
  const [permissionsDashboardOpen, setPermissionsDashboardOpen] = useState(false);
  const [selectedSecretaria, setSelectedSecretaria] = useState<Secretaria | null>(null);
  
  const { fetchSecretariaPermissions } = useSecretariaPermissions();
  const [secretariasWithPermissions, setSecretariasWithPermissions] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const loadPermissionsBadges = async () => {
      const idsWithPerms = new Set<string>();
      
      for (const sec of secretarias) {
        const perms = await fetchSecretariaPermissions(sec.id);
        if (perms && perms.length > 0) {
          idsWithPerms.add(sec.id);
        }
      }
      
      setSecretariasWithPermissions(idsWithPerms);
    };
    
    if (secretarias.length > 0) {
      loadPermissionsBadges();
    }
  }, [secretarias, fetchSecretariaPermissions]);

  // Header Actions Component
  const HeaderActions = () => (
    <div className="flex gap-2">
      <Button 
        size={isMobile ? "sm" : "default"}
        variant="outline"
        onClick={() => setPermissionsDashboardOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Shield className="h-4 w-4" />
        <span className="ml-2">Permissões</span>
      </Button>
      <Button 
        size={isMobile ? "sm" : "default"}
        onClick={() => setCreateModalOpen(true)}
        className={RESPONSIVE_CLASSES.iconButton}
      >
        <Plus className="h-4 w-4" />
        <span className="ml-2">Nova Secretaria</span>
      </Button>
    </div>
  );

  // Filters Content Component
  const FiltersContent = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filters.status === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, status: 'all' })}
        >
          Todos
        </Button>
        <Button
          variant={filters.status === 'active' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, status: 'active' })}
        >
          Ativos
        </Button>
        <Button
          variant={filters.status === 'inactive' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilters({ ...filters, status: 'inactive' })}
        >
          Inativos
        </Button>
      </div>
    </div>
  );

  // Mobile Filters Sheet Component
  const MobileFiltersSheet = () => {
    const activeFiltersCount = (filters.status !== 'all' ? 1 : 0) + (filters.search ? 1 : 0);

    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[60vh]">
          <SheetHeader>
            <SheetTitle>Filtrar Secretarias</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FiltersContent />
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  // Render Secretaria Card for Mobile
  const renderSecretariaCard = (secretaria: Secretaria) => (
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={secretaria.avatar} />
            <AvatarFallback>{getInitials(secretaria.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{secretaria.name}</h3>
              {secretariasWithPermissions.has(secretaria.id) && (
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  <Key className="h-3 w-3 mr-1" />
                  Permissões+
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{secretaria.email}</p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedSecretaria(secretaria);
                setEditModalOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedSecretaria(secretaria);
                setPermissionsModalOpen(true);
              }}
            >
              <Key className="mr-2 h-4 w-4" />
              Gerenciar Permissões
            </DropdownMenuItem>
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Tel:</span>
        <span>{secretaria.phone || '—'}</span>
        <span className="text-muted-foreground mx-1">•</span>
        <span className="text-muted-foreground">Criado:</span>
        <span>{format(new Date(secretaria.created_at), 'dd/MM/yy', { locale: ptBR })}</span>
        <Badge variant={secretaria.is_active ? 'default' : 'secondary'} className="ml-auto">
          {secretaria.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      </div>
    </CardContent>
  );

  return (
    <AppLayout>
      <PageLayout
        title="Gerenciar Secretarias"
        subtitle="Gerencie usuários com acesso administrativo à secretaria"
        actions={<HeaderActions />}
        filters={
          <div className="glass rounded-lg p-4">
            <FiltersContent />
          </div>
        }
        mobileFilters={<MobileFiltersSheet />}
      >
        {/* Stats Cards Responsivos */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
              <p className="text-xl sm:text-3xl font-bold">{secretarias.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Ativos</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-3 sm:p-6 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">Inativos</p>
              <p className="text-xl sm:text-3xl font-bold text-muted-foreground">{inactiveCount}</p>
            </CardContent>
          </Card>
        </div>

        {isMobile ? (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : secretarias.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                Nenhuma secretaria encontrada
              </div>
            ) : (
              secretarias.map((sec) => (
                <Card key={sec.id} className="glass-card">
                  {renderSecretariaCard(sec)}
                </Card>
              ))
            )}
          </div>
        ) : (
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
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{secretaria.name}</span>
                              {secretariasWithPermissions.has(secretaria.id) && (
                                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                  <Key className="h-3 w-3 mr-1" />
                                  Permissões+
                                </Badge>
                              )}
                            </div>
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
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSecretaria(secretaria);
                                  setEditModalOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedSecretaria(secretaria);
                                  setPermissionsModalOpen(true);
                                }}
                              >
                                <Key className="mr-2 h-4 w-4" />
                                Gerenciar Permissões
                              </DropdownMenuItem>
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
        )}

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

        {/* Edit Modal */}
        <SecretariaFormModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          secretaria={selectedSecretaria}
          onUpdate={async (id, updates) => {
            const success = await updateSecretaria(id, updates);
            if (success) {
              setEditModalOpen(false);
              setSelectedSecretaria(null);
            }
            return success;
          }}
          onSubmit={async () => false}
        />

        {/* Permissions Modal */}
        <SecretariaPermissionsModal
          open={permissionsModalOpen}
          onOpenChange={setPermissionsModalOpen}
          secretaria={selectedSecretaria}
        />

        {/* Permissions Dashboard */}
        <PermissionsDashboard
          open={permissionsDashboardOpen}
          onOpenChange={(open) => {
            setPermissionsDashboardOpen(open);
            if (!open) {
              // Refresh list when dashboard closes
            }
          }}
        />
      </PageLayout>
    </AppLayout>
  );
}
