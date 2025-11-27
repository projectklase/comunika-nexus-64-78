import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Save, RotateCcw, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnlockables } from '@/hooks/useUnlockables';
import { PremiumAvatar } from '@/components/gamification/PremiumAvatar';
import { AvatarGalleryModal } from '@/components/gamification/AvatarGalleryModal';

export function ProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { getEquippedAvatarData } = useUnlockables();
  const [isLoading, setIsLoading] = useState(false);
  const [showAvatarGallery, setShowAvatarGallery] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });

  const equippedAvatar = getEquippedAvatarData();

  // Only secretaria and administrador can edit profile data
  const canEditProfile = user?.role === 'secretaria' || user?.role === 'administrador';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, avatar: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setFormData(prev => ({ ...prev, avatar: '' }));
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
        avatar: formData.avatar,
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
      avatar: user?.avatar || '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            {user?.role === 'aluno' && equippedAvatar ? (
              // Avatar Premium para Alunos
              <>
                <PremiumAvatar
                  emoji={equippedAvatar.emoji}
                  rarity={equippedAvatar.rarity as any}
                  size="lg"
                />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium">{equippedAvatar.name}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAvatarGallery(true)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Trocar Avatar
                  </Button>
                </div>
              </>
            ) : (
              // Upload Tradicional para Outros Roles
              <>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.avatar} alt={formData.name} />
                  <AvatarFallback className="text-lg bg-primary/20 text-primary">
                    {formData.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="relative overflow-hidden">
                      <Upload className="h-4 w-4 mr-2" />
                      Fazer upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </Button>
                    {formData.avatar && (
                      <Button size="sm" variant="ghost" onClick={handleRemoveAvatar}>
                        <X className="h-4 w-4 mr-2" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG ou GIF. Máximo 2MB.
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

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

      {/* Avatar Gallery Modal for Students */}
      {user?.role === 'aluno' && (
        <AvatarGalleryModal
          open={showAvatarGallery}
          onOpenChange={setShowAvatarGallery}
        />
      )}
    </div>
  );
}
