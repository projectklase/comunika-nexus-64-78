import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Send, Users, Building2, Bell } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Admin {
  id: string;
  name: string;
  email: string;
}

export function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetType, setTargetType] = useState<'all_admins' | 'specific_admins'>('all_admins');
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
  const [channel, setChannel] = useState<'notification' | 'email' | 'both'>('notification');

  const { data: admins = [] } = useQuery({
    queryKey: ['admins-list'],
    queryFn: async () => {
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'administrador');

      if (!adminRoles?.length) return [];

      const adminIds = adminRoles.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', adminIds);

      return (profiles || []) as Admin[];
    },
    enabled: open,
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('create_broadcast', {
        p_title: title,
        p_message: message,
        p_target_type: targetType,
        p_target_ids: targetType === 'specific_admins' ? selectedAdmins : [],
        p_channel: channel,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Broadcast enviado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['platform-metrics'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setTargetType('all_admins');
    setSelectedAdmins([]);
    setChannel('notification');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (targetType === 'specific_admins' && selectedAdmins.length === 0) {
      toast.error('Selecione pelo menos um administrador');
      return;
    }
    broadcastMutation.mutate();
  };

  const toggleAdmin = (adminId: string) => {
    setSelectedAdmins(prev => 
      prev.includes(adminId) 
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar Broadcast
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da mensagem"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Conteúdo da mensagem..."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Destinatários</Label>
            <Select value={targetType} onValueChange={(v) => setTargetType(v as typeof targetType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_admins">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Todos os Administradores
                  </div>
                </SelectItem>
                <SelectItem value="specific_admins">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Administradores Específicos
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === 'specific_admins' && (
            <div className="space-y-2">
              <Label>Selecionar Administradores ({selectedAdmins.length} selecionados)</Label>
              <ScrollArea className="h-40 border rounded-lg p-2">
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleAdmin(admin.id)}
                    >
                      <Checkbox
                        checked={selectedAdmins.includes(admin.id)}
                        onCheckedChange={() => toggleAdmin(admin.id)}
                      />
                      <div>
                        <p className="text-sm font-medium">{admin.name}</p>
                        <p className="text-xs text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-2">
            <Label>Canal de Envio</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notification">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Apenas Notificação
                  </div>
                </SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="both">Notificação + Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={broadcastMutation.isPending}>
              {broadcastMutation.isPending ? 'Enviando...' : 'Enviar Broadcast'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
