import { useState, useEffect } from 'react';
import { User, Copy, Eye, EyeOff, Save, X, Search, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { passwordResetStore, PasswordResetRequest } from '@/stores/password-reset-store';
import { usePeopleStore } from '@/stores/people-store';
import { Person } from '@/types/class';
import { logAudit } from '@/stores/audit-store';

interface ResetRequestModalProps {
  request: PasswordResetRequest;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const ResetRequestModal = ({ request, isOpen, onClose, onComplete }: ResetRequestModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [foundUser, setFoundUser] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState(request.email);
  const [isSearching, setIsSearching] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requiresChange, setRequiresChange] = useState(true);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user, updatePassword } = useAuth();
  const { toast } = useToast();
  const { people } = usePeopleStore();

  // Reset modal state when request changes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFoundUser(null);
      setSearchQuery(request.email);
      setNewPassword('');
      setConfirmPassword('');
      setRequiresChange(true);
      setNotes('');
      
      // Auto-search for user
      searchUser(request.email);
    }
  }, [request, isOpen]);

  const searchUser = async (email: string) => {
    setIsSearching(true);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // First check in people store
    let foundPerson = people.find(p => 
      p.email?.toLowerCase() === email.toLowerCase() ||
      p.student?.email?.toLowerCase() === email.toLowerCase() ||
      p.teacher?.email?.toLowerCase() === email.toLowerCase()
    );

    // If not found in people store, check auth users
    if (!foundPerson) {
      const authUsers = [
        { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Maria Silva', email: 'secretaria@comunika.com', role: 'SECRETARIA' },
        { id: '550e8400-e29b-41d4-a716-446655440001', name: 'João Santos', email: 'professor@comunika.com', role: 'PROFESSOR' },
        { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Ana Costa', email: 'aluno@comunika.com', role: 'ALUNO' }
      ];
      
      const authUser = authUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (authUser) {
        foundPerson = {
          id: authUser.id,
          name: authUser.name,
          email: authUser.email,
          role: authUser.role as any,
          isActive: true,
          createdAt: new Date().toISOString()
        } as Person;
      }
    }
    
    setFoundUser(foundPerson || null);
    setIsSearching(false);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Senha copiada para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar a senha",
        variant: "destructive",
      });
    }
  };

  const isPasswordValid = () => {
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    
    return hasUpperCase && hasLowerCase && hasNumbers;
  };

  const getPasswordStrength = () => {
    if (newPassword.length < 8) return { level: 'weak', text: 'Muito fraca' };
    
    let score = 0;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) score++;
    if (newPassword.length >= 12) score++;
    
    if (score < 3) return { level: 'weak', text: 'Fraca' };
    if (score < 4) return { level: 'medium', text: 'Média' };
    return { level: 'strong', text: 'Forte' };
  };

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSavePassword = async () => {
    if (!foundUser || !isPasswordValid()) return;
    
    setIsProcessing(true);
    
    try {
      // Hash the password (simple hash for demo - in production use proper bcrypt)
      const hashedPassword = await hashPassword(newPassword);
      
      // Update password using auth context
      const success = await updatePassword(foundUser.id, newPassword, requiresChange);
      
      if (!success) {
        throw new Error('Failed to update password in auth system');
      }

      // Also update in people store if the user exists there
      try {
        const peopleStore = usePeopleStore.getState();
        const existsInPeopleStore = peopleStore.getPerson(foundUser.id);
        if (existsInPeopleStore) {
          await peopleStore.updatePerson(foundUser.id, {
            passwordHash: hashedPassword,
            mustChangePassword: requiresChange
          });
        }
      } catch (peopleError) {
        console.warn('User not in people store, but auth updated successfully');
      }
      
      // Complete the reset request
      passwordResetStore.complete(request.id, {
        processedBy: user?.id || 'unknown',
        requiresChangeOnNextLogin: requiresChange,
        notes: notes.trim() || undefined
      });
      
      // Update the request with resolved user info
      passwordResetStore.resolveUser(request.id, foundUser.id, foundUser.role as any);
      
      // Log audit event
      logAudit({
        action: 'UPDATE',
        entity: 'USER',
        entity_id: foundUser.id,
        entity_label: `Senha redefinida para ${foundUser.name} (${foundUser.role})`,
        scope: 'GLOBAL',
        meta: {
          fields: ['password', 'mustChangePassword'],
          reset_request_id: request.id,
          requires_change: requiresChange,
          processed_by: user?.name || 'Sistema'
        },
        diff_json: {
          password: { before: '[HASH]', after: '[HASH_UPDATED]' },
          mustChangePassword: { before: false, after: requiresChange }
        },
        actor_id: user?.id || 'system',
        actor_name: user?.name || 'Sistema',
        actor_email: user?.email || 'system@comunika.com',
        actor_role: 'SECRETARIA'
      });
      
      toast({
        title: "Senha redefinida com sucesso!",
        description: `Nova senha definida para ${foundUser.name}. ${requiresChange ? 'Usuário deverá alterar no próximo login.' : ''}`,
      });
      
      onComplete();
      
    } catch (error) {
      console.error('Error updating password:', error);
      toast({
        title: "Erro",
        description: "Não foi possível redefinir a senha. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1 && foundUser) {
      // Mark as in progress
      passwordResetStore.setStatus(request.id, 'IN_PROGRESS');
      setCurrentStep(2);
    } else if (currentStep === 2 && isPasswordValid()) {
      setCurrentStep(3);
    }
  };

  const strength = getPasswordStrength();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Processar Reset de Senha
          </DialogTitle>
          <DialogDescription>
            Solicitação de {request.email} - {new Date(request.createdAt).toLocaleDateString('pt-BR')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep >= step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`
                    w-12 h-0.5 mx-2
                    ${currentStep > step ? 'bg-primary' : 'bg-muted'}
                  `} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Identify User */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Identificar usuário</CardTitle>
                <CardDescription>Localize o usuário no sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="flex gap-2">
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Digite o email para buscar..."
                      disabled={isSearching}
                    />
                    <Button
                      onClick={() => searchUser(searchQuery)}
                      disabled={isSearching || !searchQuery.trim()}
                      variant="outline"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isSearching && (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Buscando usuário...</p>
                  </div>
                )}

                {!isSearching && foundUser && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{foundUser.name}</h3>
                        <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline">{foundUser.role}</Badge>
                          {foundUser.role === 'ALUNO' && foundUser.student?.classIds && (
                            <span className="text-xs text-muted-foreground">
                              Turmas: {foundUser.student.classIds.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                  </div>
                )}

                {!isSearching && searchQuery && !foundUser && (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                      <p className="text-sm text-destructive">
                        Email não encontrado no sistema
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verifique se o email está correto ou se o usuário está cadastrado
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Set Password */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">2. Definir senha</CardTitle>
                <CardDescription>Configure a nova senha para o usuário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={generateRandomPassword}
                      variant="outline"
                      className="flex-1"
                    >
                      Gerar senha temporária
                    </Button>
                    {newPassword && (
                      <Button
                        onClick={() => copyToClipboard(newPassword)}
                        variant="outline"
                        size="icon"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nova senha</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Digite a nova senha"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Confirmar senha</Label>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a senha"
                      />
                    </div>
                  </div>

                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Força da senha:</span>
                        <span className={`text-sm font-medium ${
                          strength.level === 'strong' ? 'text-success' : 
                          strength.level === 'medium' ? 'text-warning' : 'text-destructive'
                        }`}>
                          {strength.text}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-300 ${
                          strength.level === 'strong' ? 'bg-success w-full' : 
                          strength.level === 'medium' ? 'bg-warning w-2/3' : 'bg-destructive w-1/3'
                        }`} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Mínimo: 8 caracteres, maiúscula, minúscula e número
                      </div>
                    </div>
                  )}

                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <div className="text-sm text-destructive">
                      As senhas não coincidem
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Save & Complete */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Salvar & concluir</CardTitle>
                <CardDescription>Configurações finais e observações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium">Exigir troca no próximo login</Label>
                    <p className="text-xs text-muted-foreground">
                      O usuário será forçado a alterar a senha no próximo acesso
                    </p>
                  </div>
                  <Switch
                    checked={requiresChange}
                    onCheckedChange={setRequiresChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Adicione observações sobre este reset..."
                    rows={3}
                  />
                </div>

                {foundUser && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                    <h4 className="font-medium text-sm mb-2">Resumo:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Usuário: {foundUser.name} ({foundUser.role})</li>
                      <li>• Email: {foundUser.email}</li>
                      <li>• Nova senha: {showPassword ? newPassword : '••••••••••••'}</li>
                      <li>• Troca obrigatória: {requiresChange ? 'Sim' : 'Não'}</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Voltar
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                onClick={handleNextStep}
                disabled={
                  (currentStep === 1 && !foundUser) ||
                  (currentStep === 2 && !isPasswordValid())
                }
              >
                Próximo
              </Button>
            ) : (
              <Button
                onClick={handleSavePassword}
                disabled={isProcessing || !foundUser || !isPasswordValid()}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar & Concluir
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};