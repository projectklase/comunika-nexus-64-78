import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Key, Building2, CheckCircle2 } from 'lucide-react';
import { Secretaria } from '@/types/secretaria';
import { useSecretariaPermissions } from '@/hooks/useSecretariaPermissions';
import { useAvailableSchools } from '@/hooks/useAvailableSchools';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SecretariaPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretaria: Secretaria | null;
}

export function SecretariaPermissionsModal({
  open,
  onOpenChange,
  secretaria
}: SecretariaPermissionsModalProps) {
  const { grantSchoolAccess, revokeSchoolAccess, fetchSecretariaPermissions, loading } = useSecretariaPermissions();
  const { schools, loading: loadingSchools } = useAvailableSchools();
  
  const [hasMultiSchoolAccess, setHasMultiSchoolAccess] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [allSchools, setAllSchools] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Carregar permissões existentes
  useEffect(() => {
    if (open && secretaria && !initialLoaded) {
      loadExistingPermissions();
    }
  }, [open, secretaria]);

  const loadExistingPermissions = async () => {
    if (!secretaria) return;
    
    const permissions = await fetchSecretariaPermissions(secretaria.id);
    
    if (permissions && permissions.length > 0) {
      const manageAllSchoolsPerm = permissions.find(p => p.permission_key === 'manage_all_schools');
      
      if (manageAllSchoolsPerm) {
        setHasMultiSchoolAccess(true);
        
        const permValue = manageAllSchoolsPerm.permission_value as any;
        const schoolIds = permValue?.schools || [];
        
        if (schoolIds.includes('*') || schoolIds === '*') {
          setAllSchools(true);
          setSelectedSchools(schools.map(s => s.id));
        } else {
          setAllSchools(false);
          setSelectedSchools(schoolIds);
        }
      }
    }
    
    setInitialLoaded(true);
  };

  const handleSave = async () => {
    if (!secretaria) return;
    
    try {
      if (!hasMultiSchoolAccess) {
        // Remover permissões se desativado
        await revokeSchoolAccess(secretaria.id);
        toast.success('Permissões removidas com sucesso');
      } else {
        // Conceder permissões
        const schoolIdsToGrant = allSchools ? '*' : selectedSchools;
        
        if (!allSchools && selectedSchools.length === 0) {
          toast.error('Selecione pelo menos uma escola ou ative "Todas as escolas"');
          return;
        }
        
        await grantSchoolAccess(secretaria.id, schoolIdsToGrant);
        toast.success('Permissões atualizadas com sucesso');
      }
      
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar permissões:', error);
      toast.error('Erro ao salvar permissões');
    }
  };

  const handleClose = () => {
    setHasMultiSchoolAccess(false);
    setSelectedSchools([]);
    setAllSchools(false);
    setInitialLoaded(false);
    onOpenChange(false);
  };

  const toggleSchool = (schoolId: string) => {
    setSelectedSchools(prev => {
      if (prev.includes(schoolId)) {
        return prev.filter(id => id !== schoolId);
      } else {
        return [...prev, schoolId];
      }
    });
  };

  const toggleAllSchools = (checked: boolean) => {
    setAllSchools(checked);
    if (checked) {
      setSelectedSchools(schools.map(s => s.id));
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!secretaria) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Gerenciar Permissões
          </DialogTitle>
          <DialogDescription>
            Configure permissões de acesso a múltiplas escolas para a secretária
          </DialogDescription>
        </DialogHeader>

        {/* Info da Secretária */}
        <Card className="glass-card border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(secretaria.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{secretaria.name}</p>
                <p className="text-sm text-muted-foreground">{secretaria.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Switch Principal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50">
            <div className="space-y-0.5">
              <Label htmlFor="multi-school" className="text-base font-semibold">
                Acesso a Múltiplas Escolas
              </Label>
              <p className="text-sm text-muted-foreground">
                Permitir que esta secretária gerencie professores em outras escolas
              </p>
            </div>
            <Switch
              id="multi-school"
              checked={hasMultiSchoolAccess}
              onCheckedChange={setHasMultiSchoolAccess}
            />
          </div>

          {/* Lista de Escolas (apenas se ativado) */}
          {hasMultiSchoolAccess && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Escolas Disponíveis</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-schools"
                    checked={allSchools}
                    onCheckedChange={toggleAllSchools}
                  />
                  <Label htmlFor="all-schools" className="text-sm cursor-pointer">
                    Todas as escolas
                  </Label>
                </div>
              </div>

              {loadingSchools ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="border border-border/50 rounded-lg p-4 space-y-2 max-h-[240px] overflow-y-auto">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 transition-colors"
                    >
                      <Checkbox
                        id={`school-${school.id}`}
                        checked={selectedSchools.includes(school.id)}
                        onCheckedChange={() => toggleSchool(school.id)}
                        disabled={allSchools}
                      />
                      <Label
                        htmlFor={`school-${school.id}`}
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{school.name}</span>
                        {school.slug && (
                          <span className="text-xs text-muted-foreground">({school.slug})</span>
                        )}
                      </Label>
                      {selectedSchools.includes(school.id) && (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  ))}
                  
                  {schools.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhuma escola disponível
                    </p>
                  )}
                </div>
              )}

              {!allSchools && selectedSchools.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedSchools.length} escola(s) selecionada(s)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || loadingSchools}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Permissões'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
