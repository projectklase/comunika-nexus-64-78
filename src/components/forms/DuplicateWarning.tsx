import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  Hash,
  Edit3,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  dob?: string;
  enrollmentNumber?: string;
}

interface DuplicateIssue {
  type: 'blocking' | 'critical' | 'info';
  field: 'email' | 'name' | 'phone' | 'document' | 'enrollment';
  message: string;
  existingUsers: ExistingUser[];
}

interface DuplicateWarningProps {
  issues: DuplicateIssue[];
  hasBlocking: boolean;
  onCancel: () => void;
  onConfirm?: () => void;
  showActions?: boolean;
}

export function DuplicateWarning({
  issues,
  hasBlocking,
  onCancel,
  onConfirm,
  showActions = true,
}: DuplicateWarningProps) {
  const getIconAndColors = (type: 'blocking' | 'critical' | 'info') => {
    switch (type) {
      case 'blocking':
        return {
          icon: ShieldAlert,
          gradient: 'from-red-500/10 via-red-500/5 to-transparent',
          borderColor: 'border-red-500/30',
          iconColor: 'text-red-500',
          iconBg: 'bg-red-500/10',
          shadow: 'shadow-lg shadow-red-500/20',
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          gradient: 'from-yellow-500/10 via-orange-500/5 to-transparent',
          borderColor: 'border-yellow-500/30',
          iconColor: 'text-yellow-500',
          iconBg: 'bg-yellow-500/10',
          shadow: 'shadow-lg shadow-yellow-500/20',
        };
      case 'info':
        return {
          icon: Info,
          gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent',
          borderColor: 'border-blue-500/30',
          iconColor: 'text-blue-500',
          iconBg: 'bg-blue-500/10',
          shadow: 'shadow-lg shadow-blue-500/20',
        };
    }
  };

  const getFieldBadge = (fieldType: 'email' | 'name' | 'phone' | 'document' | 'enrollment') => {
    const badges = {
      email: { icon: Mail, label: 'EMAIL', color: 'bg-red-500/10 text-red-500 border-red-500/30' },
      name: { icon: User, label: 'NOME', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' },
      phone: { icon: Phone, label: 'TELEFONE', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
      document: { icon: FileText, label: 'DOCUMENTO', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
      enrollment: { icon: Hash, label: 'MATRÍCULA', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30' },
    };
    
    // Retornar badge padrão se não encontrar
    return badges[fieldType] || badges.document;
  };

  const mainType = hasBlocking ? 'blocking' : issues[0]?.type || 'info';
  const { icon: MainIcon, gradient, borderColor, iconColor, iconBg, shadow } = getIconAndColors(mainType);
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Alert className={cn(
      'border overflow-hidden relative animate-in fade-in-50 duration-300',
      borderColor,
      shadow
    )}>
      {/* Gradient Background */}
      <div className={cn('absolute inset-0 bg-gradient-to-br', gradient)} />
      
      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl',
              iconBg
            )}>
              <MainIcon className={cn('h-6 w-6', iconColor)} />
            </div>
            <AlertTitle className="text-lg font-bold text-foreground m-0">
              {hasBlocking ? 'Problemas Bloqueantes Detectados' : 'Avisos de Duplicatas'}
            </AlertTitle>
          </div>
        </div>

        <AlertDescription className="space-y-6">
          {/* Issues List */}
          {issues.map((issue, idx) => {
            const issueColors = getIconAndColors(issue.type);
            const IssueBadge = getFieldBadge(issue.field);
            const IssueIcon = issueColors.icon;
            
            return (
              <div key={idx} className="space-y-3">
                {/* Issue Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <IssueIcon className={cn('h-5 w-5', issueColors.iconColor)} />
                    <p className={cn(
                      'text-sm font-semibold',
                      issue.type === 'blocking' ? 'text-red-500' : 
                      issue.type === 'critical' ? 'text-yellow-600' : 'text-blue-500'
                    )}>
                      {issue.type === 'blocking' ? '🚫 BLOQUEANTE' : 
                       issue.type === 'critical' ? '⚠️ AVISO CRÍTICO' : 'ℹ️ AVISO'}
                    </p>
                  </div>
                  
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'gap-1.5 px-2.5 py-1 text-xs font-semibold border',
                      IssueBadge.color
                    )}
                  >
                    <IssueBadge.icon className="h-3.5 w-3.5" />
                    {IssueBadge.label}
                  </Badge>
                </div>

                {/* Issue Message */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {issue.message}
                </p>
                
                {/* Existing Users */}
                {issue.existingUsers.length > 0 && (
                  <div className="space-y-2">
                    {issue.existingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-background/60 border border-border/50 backdrop-blur-sm transition-all hover:bg-background/80"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-semibold text-foreground truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                          
                          {(user.enrollmentNumber || user.dob) && (
                            <div className="flex gap-2 flex-wrap mt-1.5">
                              {user.enrollmentNumber && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  {user.enrollmentNumber}
                                </Badge>
                              )}
                              {user.dob && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                  {new Date(user.dob).toLocaleDateString('pt-BR')}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Divider between issues */}
                {idx < issues.length - 1 && (
                  <div className="border-t border-border/30 pt-4 mt-4" />
                )}
              </div>
            );
          })}

          {/* Actions */}
          {showActions && (
            <div className="flex gap-2 pt-4">
              {hasBlocking ? (
                <Button
                  variant="destructive"
                  onClick={onCancel}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Edit3 className="h-4 w-4" />
                  🔙 Voltar e Corrigir
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={onCancel}
                    className="flex-1 gap-2"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={onConfirm}
                    className="flex-1 gap-2 bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <Check className="h-4 w-4" />
                    Confirmar Mesmo Assim
                  </Button>
                </>
              )}
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}
