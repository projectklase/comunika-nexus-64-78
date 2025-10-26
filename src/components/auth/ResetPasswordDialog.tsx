import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { passwordResetStore } from "@/stores/password-reset-store";
import { Mail, Send, Loader2 } from "lucide-react";

interface ResetPasswordDialogProps {
  prefilledEmail: string;
  trigger: React.ReactNode;
}

export const ResetPasswordDialog = ({ prefilledEmail, trigger }: ResetPasswordDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState(prefilledEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive",
      });
      return;
    }

    // Check if email exists in the system
    const peopleData = localStorage.getItem("comunika_people_v2");
    const authUsers = [
      { email: "secretaria@comunika.com" },
      { email: "professor@klase.app" },
      { email: "aluno@klase.app" },
    ];

    let emailExists = false;

    // Check in people store
    if (peopleData) {
      const people = JSON.parse(peopleData);
      emailExists = people.some(
        (p) =>
          p.email?.toLowerCase() === email.toLowerCase() ||
          p.student?.email?.toLowerCase() === email.toLowerCase() ||
          p.teacher?.email?.toLowerCase() === email.toLowerCase(),
      );
    }

    // Check in auth users
    if (!emailExists) {
      emailExists = authUsers.some((u) => u.email.toLowerCase() === email.toLowerCase());
    }

    if (!emailExists) {
      toast({
        title: "Email não encontrado",
        description: "Este email não está cadastrado no sistema.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the passwordResetStore to create the request - this will automatically create notifications
      passwordResetStore.createRequest(email);

      toast({
        title: "Solicitação enviada",
        description: "A secretaria foi notificada e entrará em contato em breve.",
      });

      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível processar a solicitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="reset-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Redefinir senha
          </DialogTitle>
          <DialogDescription>
            Informe seu email para solicitar a redefinição de senha. A secretaria será notificada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email" className="modern-label">
              Email
            </Label>
            <div className="relative">
              <Mail className="input-icon" />
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="modern-input pl-10"
                required
                autoComplete="email"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSubmitting || !email}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
