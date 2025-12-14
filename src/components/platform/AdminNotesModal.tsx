import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AdminNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  admin: any;
  onSuccess?: () => void;
}

export function AdminNotesModal({ open, onOpenChange, admin, onSuccess }: AdminNotesModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (open && admin?.id) {
      loadNotes();
    }
  }, [open, admin?.id]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_subscriptions')
        .select('general_notes, updated_at')
        .eq('admin_id', admin.id)
        .maybeSingle();

      if (error) throw error;
      
      setNotes(data?.general_notes || '');
      setLastUpdated(data?.updated_at || null);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Erro ao carregar observações');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('admin_subscriptions')
        .update({ 
          general_notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('admin_id', admin.id);

      if (error) throw error;
      
      toast.success('Observações salvas com sucesso');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao salvar observações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Observações
          </DialogTitle>
          <DialogDescription>
            {admin?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anote informações de pagamento, detalhes do cliente, acordos comerciais..."
                className="min-h-[150px] resize-none bg-white/5 border-white/10"
              />
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Última atualização: {format(new Date(lastUpdated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
