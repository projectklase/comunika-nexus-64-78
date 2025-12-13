import { useState } from 'react';
import { AlertTriangle, Trash2, Building2, GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteAdminModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    schools_count?: number;
    total_students?: number;
  } | null;
  onSuccess: () => void;
}

export function DeleteAdminModal({ open, onOpenChange, admin, onSuccess }: DeleteAdminModalProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!admin || !user?.email || !password) {
      toast.error('Preencha sua senha para confirmar');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Verify superadmin password
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-superadmin-password',
        {
          body: { email: user.email, password },
        }
      );

      if (verifyError || !verifyData?.valid) {
        toast.error(verifyData?.error || 'Senha inválida');
        setLoading(false);
        return;
      }

      // Step 2: Delete the administrator
      const { error: deleteError } = await supabase.functions.invoke('delete-user', {
        body: { userId: admin.id },
      });

      if (deleteError) {
        throw deleteError;
      }

      // Step 3: Log the action in audit
      await supabase.from('platform_audit_logs').insert({
        superadmin_id: user.id,
        action: 'DELETE_ADMIN',
        entity_type: 'admin',
        entity_id: admin.id,
        entity_label: admin.name,
        details: {
          email: admin.email,
          schools_count: admin.schools_count,
          total_students: admin.total_students,
        },
      });

      toast.success(`Administrador "${admin.name}" excluído com sucesso`);
      setPassword('');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Erro ao excluir administrador');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!loading) {
      setPassword('');
      onOpenChange(isOpen);
    }
  };

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Excluir Administrador
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível e removerá permanentemente todos os dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Admin Info Card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
            <Avatar className="w-10 h-10">
              <AvatarImage src={admin.avatar} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {admin.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{admin.name}</p>
              <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="w-4 h-4" />
              {admin.schools_count || 0} {(admin.schools_count || 0) === 1 ? 'escola' : 'escolas'}
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-4 h-4" />
              {admin.total_students || 0} alunos
            </span>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm text-destructive">
              <p className="font-medium mb-1">Aviso Importante</p>
              <ul className="list-disc list-inside space-y-0.5 text-destructive/80">
                <li>Conta do administrador será excluída</li>
                <li>Todas as escolas vinculadas serão removidas</li>
                <li>Todos os dados associados serão perdidos</li>
              </ul>
            </div>
          </div>

          {/* Password Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="superadmin-password">
              Digite <span className="font-semibold">SUA SENHA</span> para confirmar
            </Label>
            <div className="relative">
              <Input
                id="superadmin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha de super admin"
                disabled={loading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !password}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir Admin
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
