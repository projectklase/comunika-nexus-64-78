import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Key, Mail, RefreshCw, Copy, Check, Loader2 } from "lucide-react";
import { generateSecurePassword } from "@/lib/validation";

interface AdminPasswordResetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export function AdminPasswordResetModal({
  open,
  onOpenChange,
  admin,
}: AdminPasswordResetModalProps) {
  const [method, setMethod] = useState<"email" | "generate">("generate");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(true);
  const [copied, setCopied] = useState(false);

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!admin) throw new Error("Admin não selecionado");

      const { data, error } = await supabase.functions.invoke(
        "admin-password-reset",
        {
          body: {
            adminId: admin.id,
            newPassword: method === "generate" ? generatedPassword : undefined,
            sendEmail: method === "email",
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // If generate method and send credentials email is checked, send the welcome email
      if (method === "generate" && sendCredentialsEmail && generatedPassword) {
        const { error: emailError } = await supabase.functions.invoke(
          "send-admin-welcome-email",
          {
            body: {
              adminName: admin.name,
              adminEmail: admin.email,
              password: generatedPassword,
              isPasswordReset: true,
            },
          }
        );

        if (emailError) {
          console.error("Failed to send credentials email:", emailError);
          // Don't fail the whole operation, just notify
          toast.warning("Senha redefinida, mas falha ao enviar email");
        }
      }

      return data;
    },
    onSuccess: (data) => {
      if (data?.method === "email_sent") {
        toast.success("Email de redefinição enviado com sucesso");
      } else {
        toast.success(
          sendCredentialsEmail
            ? "Senha redefinida e enviada por email"
            : "Senha redefinida com sucesso"
        );
      }
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao redefinir senha: ${error.message}`);
    },
  });

  const resetForm = () => {
    setMethod("generate");
    setGeneratedPassword("");
    setSendCredentialsEmail(true);
    setCopied(false);
  };

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword();
    setGeneratedPassword(newPassword);
    setCopied(false);
  };

  const handleCopyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      toast.success("Senha copiada para a área de transferência");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = () => {
    if (method === "generate" && !generatedPassword) {
      toast.error("Gere uma senha antes de continuar");
      return;
    }
    resetMutation.mutate();
  };

  const canSubmit = method === "email" || (method === "generate" && generatedPassword);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Redefinir Senha
          </DialogTitle>
        </DialogHeader>

        {admin && (
          <div className="space-y-6">
            {/* Admin Info */}
            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
              <p className="font-medium text-foreground">{admin.name}</p>
              <p className="text-sm text-muted-foreground">{admin.email}</p>
            </div>

            {/* Method Selection */}
            <div className="space-y-3">
              <Label>Método de Redefinição</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as "email" | "generate")}
                className="space-y-3"
              >
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    method === "email"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  }`}
                  onClick={() => setMethod("email")}
                >
                  <RadioGroupItem value="email" id="email" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="email" className="cursor-pointer font-medium">
                      <Mail className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                      Enviar Email
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Envia link de redefinição para o admin
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    method === "generate"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80"
                  }`}
                  onClick={() => setMethod("generate")}
                >
                  <RadioGroupItem value="generate" id="generate" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="generate" className="cursor-pointer font-medium">
                      <Key className="inline h-4 w-4 mr-1.5 -mt-0.5" />
                      Gerar Nova Senha
                    </Label>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Sistema gera senha segura automaticamente
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Password Generation Section */}
            {method === "generate" && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={generatedPassword}
                      readOnly
                      placeholder="Clique em gerar..."
                      className="pr-10 font-mono text-sm bg-muted/30"
                    />
                    {generatedPassword && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={handleCopyPassword}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePassword}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Gerar
                  </Button>
                </div>

                {generatedPassword && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sendEmail"
                      checked={sendCredentialsEmail}
                      onCheckedChange={(checked) =>
                        setSendCredentialsEmail(checked as boolean)
                      }
                    />
                    <Label htmlFor="sendEmail" className="text-sm cursor-pointer">
                      Enviar credenciais por email
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Redefinir Senha"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
