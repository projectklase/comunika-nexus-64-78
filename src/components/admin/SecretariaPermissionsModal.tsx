import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Key, Building2 } from 'lucide-react';
import { Secretaria } from '@/types/secretaria';
import { useSecretariaPermissions } from '@/hooks/useSecretariaPermissions';
import { useSchool } from '@/contexts/SchoolContext';

interface SecretariaPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretaria: Secretaria | null;
}

export function SecretariaPermissionsModal({
  open,
  onOpenChange,
  secretaria,
}: SecretariaPermissionsModalProps) {
  const { availableSchools } = useSchool();
  const {
    permissions,
    loading,
    hasPermission,
    getPermissionValue,
    grantPermission,
    revokePermission,
  } = useSecretariaPermissions(secretaria?.id);

  const [manageAllSchools, setManageAllSchools] = useState(false);
  const [schoolsMode, setSchoolsMode] = useState<'all' | 'specific'>('all');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && secretaria) {
      const hasPermission = permissions.some((p) => p.permission_key === 'manage_all_schools');
      setManageAllSchools(hasPermission);

      if (hasPermission) {
        const permValue = getPermissionValue('manage_all_schools');
        const schools = permValue?.schools || [];
        if (schools.includes('*')) {
          setSchoolsMode('all');
          setSelectedSchools([]);
        } else {
          setSchoolsMode('specific');
          setSelectedSchools(schools);
        }
      } else {
        setSchoolsMode('all');
        setSelectedSchools([]);
      }
    }
  }, [open, secretaria, permissions, getPermissionValue]);

  const handleSave = async () => {
    if (!secretaria) return;

    setIsSaving(true);
    try {
      if (!manageAllSchools) {
        // Revogar permissão
        await revokePermission(secretaria.id, 'manage_all_schools');
      } else {
        // Conceder permissão
        const value = {
          schools: schoolsMode === 'all' ? ['*'] : selectedSchools,
        };
        await grantPermission(secretaria.id, 'manage_all_schools', value);
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSchool = (schoolId: string) => {
    setSelectedSchools((prev) =>
      prev.includes(schoolId)
        ? prev.filter((id) => id !== schoolId)
        : [...prev, schoolId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Permissões de {secretaria?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Permissão: Gerenciar Professores em Múltiplas Escolas */}
          <Card className="p-4 space-y-4 bg-background/50 backdrop-blur-sm border-border/50">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Gerenciar Professores em Múltiplas Escolas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permite atribuir professores a escolas além daquela onde a secretária tem acesso
                </p>
              </div>
              <Switch
                checked={manageAllSchools}
                onCheckedChange={setManageAllSchools}
                disabled={loading}
              />
            </div>

            {manageAllSchools && (
              <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                <RadioGroup value={schoolsMode} onValueChange={(v) => setSchoolsMode(v as 'all' | 'specific')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all-schools" />
                    <Label htmlFor="all-schools" className="font-normal cursor-pointer">
                      Todas as escolas (igual ao administrador)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific-schools" />
                    <Label htmlFor="specific-schools" className="font-normal cursor-pointer">
                      Escolas específicas
                    </Label>
                  </div>
                </RadioGroup>

                {schoolsMode === 'specific' && (
                  <div className="space-y-2 mt-4 p-4 rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium">Selecione as escolas:</Label>
                    <div className="space-y-2">
                      {availableSchools.map((school) => (
                        <div key={school.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`school-${school.id}`}
                            checked={selectedSchools.includes(school.id)}
                            onCheckedChange={() => toggleSchool(school.id)}
                          />
                          <Label
                            htmlFor={`school-${school.id}`}
                            className="font-normal cursor-pointer flex items-center gap-2"
                          >
                            {school.logo_url && (
                              <img
                                src={school.logo_url}
                                alt={school.name}
                                className="h-5 w-5 rounded object-cover"
                              />
                            )}
                            {school.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                    {selectedSchools.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedSchools.length} escola(s) selecionada(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Futuras Permissões */}
          <Card className="p-4 bg-muted/20 backdrop-blur-sm border-dashed border-border/50">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                📝 Futuras Permissões (em breve)
              </Label>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Checkbox disabled />
                  <span>Visualizar Analytics de outras escolas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox disabled />
                  <span>Gerenciar configurações globais</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || loading}>
            {isSaving ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
