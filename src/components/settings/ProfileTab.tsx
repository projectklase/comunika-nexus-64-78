import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Save, RotateCcw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnlockables } from '@/hooks/useUnlockables';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { AvatarGalleryModal } from '@/components/gamification/AvatarGalleryModal';
import { AchievementBadge } from '@/components/gamification/AchievementBadge';

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { getEquippedAvatarData, getEquippedBadges, getUnlocksByType } = useUnlockables();
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const equippedAvatar = getEquippedAvatarData();
  const equippedBadges = getEquippedBadges();
  const allBadges = getUnlocksByType('BADGE');

  // Only secretaria and administrador can edit profile data
  const canEditProfile = user?.role === 'secretaria' || user?.role === 'administrador';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateUser({
        name: formData.name,
        phone: formData.phone,
      });

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso!',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <PremiumAvatar
              emoji={equippedAvatar?.emoji || '🐱'}
              rarity={equippedAvatar?.rarity as any || 'COMMON'}
              size="xl"
            />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div>
                <p className="font-semibold text-lg">{equippedAvatar?.name || 'Avatar Padrão'}</p>
                <p className="text-sm text-muted-foreground">
                  {equippedAvatar?.rarity === 'COMMON' && '⚪ Comum'}
                  {equippedAvatar?.rarity === 'UNCOMMON' && '🟢 Incomum'}
                  {equippedAvatar?.rarity === 'RARE' && '🔵 Raro'}
                  {equippedAvatar?.rarity === 'EPIC' && '🟣 Épico'}
                  {equippedAvatar?.rarity === 'LEGENDARY' && '🟡 Lendário'}
                  {!equippedAvatar && '⚪ Comum'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAvatarGallery(true)}
                className="gap-2 bg-primary/5 border-primary/30 hover:bg-primary/10 backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4" />
                Escolher Avatar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Conquistas - apenas para alunos */}
      {user?.role === 'aluno' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <span className="text-lg">🏅</span>
                </div>
                <h3 className="text-lg font-semibold">Minhas Conquistas</h3>
              </div>
              
              {equippedBadges.length > 0 ? (
                <div className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-4">
                  <div className="flex flex-wrap gap-4">
                    {equippedBadges.map((unlock) => {
                      if (!unlock.unlockable) return null;
                      return (
                        <div key={unlock.id} className="flex flex-col items-center gap-1.5">
                          <AchievementBadge
                            unlockable={unlock.unlockable}
                            size="lg"
                          />
                          <span className="text-xs text-muted-foreground max-w-[80px] text-center line-clamp-2">
                            {unlock.unlockable.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    {equippedBadges.length} {equippedBadges.length === 1 ? 'conquista desbloqueada' : 'conquistas desbloqueadas'}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Complete desafios, mantenha streaks e ganhe XP para desbloquear conquistas!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Fields */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Digite seu nome completo"
            disabled={!canEditProfile}
            className={!canEditProfile ? "bg-muted/50" : ""}
          />
          {!canEditProfile && (
            <p className="text-xs text-muted-foreground">
              Para alterar seu nome, entre em contato com a secretaria
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            value={formData.email}
            disabled
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground">
            O e-mail não pode ser alterado
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="(11) 99999-9999"
            disabled={!canEditProfile}
            className={!canEditProfile ? "bg-muted/50" : ""}
          />
          {!canEditProfile && (
            <p className="text-xs text-muted-foreground">
              Para alterar seu telefone, entre em contato com a secretaria
            </p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <Button onClick={handleSave} disabled={isLoading}>
          <Save className="h-4 w-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Salvar'}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Cancelar
        </Button>
      </div>

      {/* Avatar Gallery Modal for All Users */}
      <AvatarGalleryModal
        open={showAvatarGallery}
        onOpenChange={setShowAvatarGallery}
      />
    </div>
  );
}
