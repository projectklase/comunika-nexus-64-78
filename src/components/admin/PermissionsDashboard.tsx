import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Key, Building2, Users, FileText, Search, Edit, XCircle, Loader2, CheckCircle2, Mail, Calendar } from 'lucide-react';
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

  // Agrupar permissões por secretária
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.secretariaId]) {
      acc[perm.secretariaId] = {
        secretaria: {
          id: perm.secretariaId,
          name: perm.secretariaName,
          email: perm.secretariaEmail,
        },
        permissions: [],
      };
    }
    acc[perm.secretariaId].permissions.push(perm);
    return acc;
  }, {} as Record<string, { secretaria: { id: string; name: string; email: string }; permissions: PermissionWithDetails[] }>);

  const getPermissionDescription = (key: string) => {
    switch (key) {
      case 'manage_all_schools':
        return 'Pode atribuir professores a múltiplas escolas';
      default:
        return key;
    }
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
              Visão detalhada de todas as permissões concedidas às secretárias
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

          {/* Lista de Permissões com Accordion */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedPermissions).length === 0 ? (
            <Card className="glass-card">
              <CardContent className="text-center py-12">
                <Key className="h-12 w-12 mx-auto mb-4 opacity-20 text-muted-foreground" />
                <p className="text-muted-foreground">Nenhuma permissão concedida ainda</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {Object.values(groupedPermissions).map(({ secretaria, permissions: perms }) => (
                <AccordionItem key={secretaria.id} value={secretaria.id} className="border-0">
                  <Card className="glass-card border-primary/20">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline">
                      <div className="flex items-center gap-4 flex-1 text-left">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-base">{secretaria.name}</p>
                            {perms.some(p => p.hasAllSchools) && (
                              <Badge variant="default" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                                Acesso Total
                              </Badge>
                            )}
                            {!perms.some(p => p.hasAllSchools) && perms[0]?.authorizedSchoolNames && (
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                                {perms[0].authorizedSchoolNames.length} {perms[0].authorizedSchoolNames.length === 1 ? 'Escola Autorizada' : 'Escolas Autorizadas'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{secretaria.email}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-4 pt-2">
                        {perms.map((perm) => (
                          <Card key={perm.id} className="border-border/50 bg-card/50">
                            <CardContent className="p-4 space-y-3">
                              {/* Cabeçalho da Permissão */}
                              <div className="flex items-start justify-between">
                                <div className="space-y-2 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Key className="h-4 w-4 text-primary" />
                                    <span className="font-medium">PERMISSÃO: {getPermissionDescription(perm.permissionKey)}</span>
                                  </div>
                                  
                                  {/* Lista de Escolas Autorizadas */}
                                  <div className="pl-6 space-y-2">
                                    {perm.hasAllSchools ? (
                                      <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                        <span className="text-green-700 dark:text-green-400 font-medium">
                                          Pode atribuir professores a todas as escolas do sistema
                                        </span>
                                      </div>
                                    ) : perm.authorizedSchoolNames && perm.authorizedSchoolNames.length > 0 ? (
                                      <>
                                        <p className="text-sm font-medium text-muted-foreground">
                                          ✅ Pode atribuir professores em:
                                        </p>
                                        <ul className="space-y-1 pl-4">
                                          {perm.authorizedSchoolNames.map((schoolName, idx) => (
                                            <li key={idx} className="flex items-center gap-2 text-sm">
                                              <Building2 className="h-3 w-3 text-primary" />
                                              <span>{schoolName}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </>
                                    ) : (
                                      <p className="text-sm text-muted-foreground italic">Nenhuma escola específica configurada</p>
                                    )}
                                  </div>

                                  {/* Data de Concessão */}
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6 pt-2 border-t border-border/50">
                                    <Calendar className="h-3 w-3" />
                                    <span>Concedido em {format(new Date(perm.grantedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                                  </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex gap-2 ml-4">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(perm)}
                                    title="Editar permissões"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeClick(perm)}
                                    title="Revogar permissões"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </Card>
                </AccordionItem>
              ))}
            </Accordion>
          )}

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
