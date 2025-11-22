import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, AlertTriangle, Info, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  dob?: string;
  enrollmentNumber?: string;
}

interface DuplicateWarningProps {
  type: 'blocking' | 'critical' | 'info';
  title: string;
  message: string;
  existingUsers: ExistingUser[];
  onConfirm?: () => void;
  onCancel?: () => void;
  showActions?: boolean;
}

export function DuplicateWarning({
  type,
  title,
  message,
  existingUsers,
  onConfirm,
  onCancel,
  showActions = true,
}: DuplicateWarningProps) {
  const getIconAndColors = () => {
    switch (type) {
      case 'blocking':
        return {
          icon: ShieldAlert,
          bgColor: 'bg-destructive/10',
          borderColor: 'border-destructive/50',
          iconColor: 'text-destructive',
          titleColor: 'text-destructive',
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/50',
          iconColor: 'text-yellow-500',
          titleColor: 'text-yellow-500',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/50',
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-500',
        };
    }
  };

  const { icon: Icon, bgColor, borderColor, iconColor, titleColor } = getIconAndColors();

  return (
    <Alert className={cn('border-2', bgColor, borderColor)}>
      <Icon className={cn('h-5 w-5', iconColor)} />
      <AlertTitle className={cn('text-base font-semibold mb-3', titleColor)}>
        {title}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm text-muted-foreground">{message}</p>
        
        {existingUsers.length > 0 && (
          <div className="space-y-2 mt-3">
            {existingUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {user.enrollmentNumber && (
                      <Badge variant="outline" className="text-xs">
                        Matrícula: {user.enrollmentNumber}
                      </Badge>
                    )}
                    {user.dob && (
                      <Badge variant="outline" className="text-xs">
                        Nascimento: {new Date(user.dob).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex gap-2 mt-4">
            {type === 'blocking' ? (
              <Button
                variant="destructive"
                onClick={onCancel}
                className="w-full"
              >
                Voltar e Corrigir
              </Button>
            ) : type === 'critical' ? (
              <>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Não, Revisar
                </Button>
                <Button
                  variant="default"
                  onClick={onConfirm}
                  className="flex-1"
                >
                  Sim, Confirmar Cadastro
                </Button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  variant="secondary"
                  onClick={onConfirm}
                  className="flex-1"
                >
                  Entendi, Continuar
                </Button>
              </div>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
