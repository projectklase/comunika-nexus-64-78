import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key, Building2, Users, FileText, Search, Edit, XCircle, Loader2 } from 'lucide-react';
import { useAllPermissions, PermissionWithDetails } from '@/hooks/useAllPermissions';
import { useAvailableSchools } from '@/hooks/useAvailableSchools';
import { useSecretarias } from '@/hooks/useSecretarias';
import { SecretariaPermissionsModal } from './SecretariaPermissionsModal';
import { useSecretariaPermissions } from '@/hooks/useSecretariaPermissions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface PermissionsDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionsDashboard({
  open,
  onOpenChange,
}: PermissionsDashboardProps) {
  const { permissions, loading, filters, setFilters, stats, refetch } = useAllPermissions();
  const { schools } = useAvailableSchools();
  const { secretarias } = useSecretarias();
  const { revokeSchoolAccess } = useSecretariaPermissions();
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedSecretaria, setSelectedSecretaria] = useState<any>(null);
  const [selectedPermission, setSelectedPermission] = useState<PermissionWithDetails | null>(null);
  const [revoking, setRevoking] = useState(false);

  const handleEdit = (permission: PermissionWithDetails) => {
    const sec = secretarias.find(s => s.id === permission.secretariaId);
    if (sec) {
      setSelectedSecretaria(sec);
      setEditModalOpen(true);
    }
  };

  const handleRevokeClick = (permission: PermissionWithDetails) => {
    setSelectedPermission(permission);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    if (!selectedPermission) return;

    setRevoking(true);
    try {
      await revokeSchoolAccess(selectedPermission.secretariaId);
      toast.success('Permissões revogadas com sucesso');
      refetch();
      setRevokeDialogOpen(false);
    } catch (error) {
      console.error('Erro ao revogar permissões:', error);
      toast.error('Falha ao revogar permissões');
    } finally {
      setRevoking(false);
    }
  };

  const getSchoolsDisplay = (permValue: any) => {
    if (!permValue) return '—';
    
    const schools = permValue.schools || [];
    
    if (schools === '*' || schools.includes('*')) {
      return <Badge variant="default">Todas as Escolas</Badge>;
    }
    
    if (Array.isArray(schools)) {
      return <Badge variant="secondary">{schools.length} escola(s)</Badge>;
    }
    
    return '—';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Key className="h-6 w-6 text-primary" />
              Dashboard de Permissões
            </DialogTitle>
            <DialogDescription>
              Visão geral de todas as permissões concedidas às secretárias
            </DialogDescription>
          </DialogHeader>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass-card border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Secretárias com Permissões</p>
                    <p className="text-2xl font-bold">{stats.totalSecretariasWithPermissions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Escolas Compartilhadas</p>
                    <p className="text-2xl font-bold">{stats.totalSchoolsShared}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Concessões</p>
                    <p className="text-2xl font-bold">{stats.totalGrants}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar secretária..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9"
              />
            </div>

            <Select
              value={filters.secretariaId || 'all'}
              onValueChange={(value) => setFilters({ ...filters, secretariaId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as secretárias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as secretárias</SelectItem>
                {secretarias.map((sec) => (
                  <SelectItem key={sec.id} value={sec.id}>
                    {sec.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.schoolId || 'all'}
              onValueChange={(value) => setFilters({ ...filters, schoolId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as escolas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as escolas</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela de Permissões */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : permissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Nenhuma permissão concedida ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Secretária</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tipo de Permissão</TableHead>
                      <TableHead>Escolas</TableHead>
                      <TableHead>Concedido em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissions.map((perm) => (
                      <TableRow key={perm.id}>
                        <TableCell className="font-medium">{perm.secretariaName}</TableCell>
                        <TableCell className="text-muted-foreground">{perm.secretariaEmail}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {perm.permissionKey === 'manage_all_schools' ? 'Múltiplas Escolas' : perm.permissionKey}
                          </Badge>
                        </TableCell>
                        <TableCell>{getSchoolsDisplay(perm.permissionValue)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(perm.grantedAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(perm)}
                              title="Editar permissões"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRevokeClick(perm)}
                              title="Revogar permissões"
                            >
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <SecretariaPermissionsModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setSelectedSecretaria(null);
            refetch();
          }
        }}
        secretaria={selectedSecretaria}
      />

      {/* Dialog de Confirmação de Revogação */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Permissões?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a revogar todas as permissões de{' '}
              <strong>{selectedPermission?.secretariaName}</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeConfirm}
              disabled={revoking}
              className="bg-destructive hover:bg-destructive/90"
            >
              {revoking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revogando...
                </>
              ) : (
                'Revogar Permissões'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
