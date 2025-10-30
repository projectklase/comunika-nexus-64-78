import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface CredentialsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  email: string;
  password: string;
  role: 'aluno' | 'professor' | 'secretaria';
}

export function CredentialsDialog({
  open,
  onOpenChange,
  name,
  email,
  password,
  role
}: CredentialsDialogProps) {
  const [showPassword, setShowPassword] = useState(true);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    toast.success('Email copiado!');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    toast.success('Senha copiada!');
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleCopyAll = () => {
    const text = `Email: ${email}\nSenha: ${password}`;
    navigator.clipboard.writeText(text);
    toast.success('Credenciais copiadas!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {role === 'aluno' ? 'Aluno' : role === 'professor' ? 'Professor' : 'Secretaria'} Criado com Sucesso!
          </DialogTitle>
          <DialogDescription>
            {name} foi cadastrado. Guarde estas credenciais em local seguro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                value={email}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyEmail}
              >
                {copiedEmail ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="flex gap-2">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyPassword}
              >
                {copiedPassword ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-sm">
            <p className="text-amber-600 dark:text-amber-400">
              <strong>⚠️ Importante:</strong> Copie e envie para {
                role === 'aluno' ? 'o aluno/responsável' : 
                role === 'professor' ? 'o professor' : 
                'a secretaria'
              }. As credenciais não serão exibidas novamente.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyAll}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copiar Tudo
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}