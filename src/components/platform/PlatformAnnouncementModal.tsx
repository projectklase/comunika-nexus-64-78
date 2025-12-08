import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Megaphone,
  Rocket,
  Gift,
  Zap,
  Bell,
  Star,
  PartyPopper,
  Sparkles,
  Heart,
  AlertTriangle,
  Loader2,
  Send,
  Users,
  Building2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AVAILABLE_ICONS = [
  { name: 'Megaphone', icon: Megaphone, label: 'Megafone' },
  { name: 'Rocket', icon: Rocket, label: 'Foguete' },
  { name: 'Gift', icon: Gift, label: 'Presente' },
  { name: 'Zap', icon: Zap, label: 'Raio' },
  { name: 'Bell', icon: Bell, label: 'Sino' },
  { name: 'Star', icon: Star, label: 'Estrela' },
  { name: 'PartyPopper', icon: PartyPopper, label: 'Festa' },
  { name: 'Sparkles', icon: Sparkles, label: 'Brilhos' },
  { name: 'Heart', icon: Heart, label: 'Coração' },
  { name: 'AlertTriangle', icon: AlertTriangle, label: 'Alerta' },
];

const THEME_COLORS = [
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#10B981', label: 'Verde' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#06B6D4', label: 'Ciano' },
  { value: '#F97316', label: 'Laranja' },
];

const ROLES = [
  { value: 'aluno', label: 'Alunos' },
  { value: 'professor', label: 'Professores' },
  { value: 'secretaria', label: 'Secretárias' },
  { value: 'administrador', label: 'Administradores' },
];

interface PlatformAnnouncementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlatformAnnouncementModal({
  open,
  onOpenChange,
}: PlatformAnnouncementModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Megaphone');
  const [themeColor, setThemeColor] = useState('#8B5CF6');
  const [selectedSchools, setSelectedSchools] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allSchools, setAllSchools] = useState(true);
  const [allRoles, setAllRoles] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch all schools
  const { data: schools = [] } = useQuery({
    queryKey: ['all-schools-for-announcement'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Estimate recipients count
  const { data: recipientCount = 0 } = useQuery({
    queryKey: ['announcement-recipients', allSchools, selectedSchools, allRoles, selectedRoles],
    queryFn: async () => {
      let query = supabase.from('school_memberships').select('user_id', { count: 'exact', head: true });

      if (!allSchools && selectedSchools.length > 0) {
        query = query.in('school_id', selectedSchools);
      }
      if (!allRoles && selectedRoles.length > 0) {
        query = query.in('role', selectedRoles);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('send_platform_announcement', {
        p_title: title,
        p_message: message,
        p_icon_name: selectedIcon,
        p_theme_color: themeColor,
        p_banner_url: null,
        p_target_schools: allSchools ? [] : selectedSchools,
        p_target_roles: allRoles ? [] : selectedRoles,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Anúncio enviado para ${data.notifications_created} usuários!`);
      queryClient.invalidateQueries({ queryKey: ['platform-announcements'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Erro ao enviar anúncio: ' + error.message);
    },
  });

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setSelectedIcon('Megaphone');
    setThemeColor('#8B5CF6');
    setSelectedSchools([]);
    setSelectedRoles([]);
    setAllSchools(true);
    setAllRoles(true);
    setShowPreview(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha título e mensagem');
      return;
    }
    sendMutation.mutate();
  };

  const SelectedIcon = AVAILABLE_ICONS.find(i => i.name === selectedIcon)?.icon || Megaphone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary" />
            Novo Anúncio da Plataforma
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-6">
          <div className="space-y-6 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título do Anúncio</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nova funcionalidade disponível!"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">{title.length}/100 caracteres</p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Descreva o anúncio em detalhes..."
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">{message.length}/500 caracteres</p>
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ICONS.map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedIcon(name)}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      selectedIcon === name
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    title={label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Color */}
            <div className="space-y-2">
              <Label>Cor do Tema</Label>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setThemeColor(value)}
                    className={cn(
                      "w-10 h-10 rounded-lg border-2 transition-all",
                      themeColor === value ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: value }}
                    title={label}
                  />
                ))}
              </div>
            </div>

            {/* Target Schools */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Escolas
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-schools"
                    checked={allSchools}
                    onCheckedChange={(checked) => {
                      setAllSchools(!!checked);
                      if (checked) setSelectedSchools([]);
                    }}
                  />
                  <label htmlFor="all-schools" className="text-sm cursor-pointer">
                    Todas as escolas
                  </label>
                </div>
              </div>

              {!allSchools && (
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {schools.map((school) => (
                    <div key={school.id} className="flex items-center gap-2">
                      <Checkbox
                        id={school.id}
                        checked={selectedSchools.includes(school.id)}
                        onCheckedChange={(checked) => {
                          setSelectedSchools(prev =>
                            checked
                              ? [...prev, school.id]
                              : prev.filter(id => id !== school.id)
                          );
                        }}
                      />
                      <label htmlFor={school.id} className="text-sm cursor-pointer truncate">
                        {school.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Target Roles */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Roles
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-roles"
                    checked={allRoles}
                    onCheckedChange={(checked) => {
                      setAllRoles(!!checked);
                      if (checked) setSelectedRoles([]);
                    }}
                  />
                  <label htmlFor="all-roles" className="text-sm cursor-pointer">
                    Todos os roles
                  </label>
                </div>
              </div>

              {!allRoles && (
                <div className="flex flex-wrap gap-3">
                  {ROLES.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${value}`}
                        checked={selectedRoles.includes(value)}
                        onCheckedChange={(checked) => {
                          setSelectedRoles(prev =>
                            checked
                              ? [...prev, value]
                              : prev.filter(r => r !== value)
                          );
                        }}
                      />
                      <label htmlFor={`role-${value}`} className="text-sm cursor-pointer">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recipients Count */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Destinatários estimados:</span>
                <Badge variant="secondary" className="text-lg px-3">
                  ~{recipientCount.toLocaleString()} usuários
                </Badge>
              </div>
            </div>

            {/* Preview Toggle */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? 'Ocultar Preview' : 'Ver Preview'}
            </Button>

            {/* Preview */}
            {showPreview && (
              <div className="relative p-6 rounded-xl border-2 overflow-hidden" style={{ borderColor: themeColor }}>
                {/* Gradient background */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{ background: `linear-gradient(135deg, ${themeColor}, transparent)` }}
                />
                
                <div className="relative flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: themeColor }}
                  >
                    <SelectedIcon className="w-8 h-8 text-white" />
                  </div>

                  {/* Klase Badge */}
                  <Badge variant="outline" className="text-xs">
                    NOVIDADE KLASE
                  </Badge>

                  {/* Title */}
                  <h3 className="text-xl font-bold">
                    {title || 'Título do Anúncio'}
                  </h3>

                  {/* Message */}
                  <p className="text-muted-foreground max-w-md">
                    {message || 'Mensagem do anúncio aparecerá aqui...'}
                  </p>

                  {/* Button Preview */}
                  <Button style={{ backgroundColor: themeColor }}>
                    Entendi ✓
                  </Button>
                </div>
              </div>
            )}
          </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={sendMutation.isPending || !title.trim() || !message.trim()}
            style={{ backgroundColor: themeColor }}
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Enviar Anúncio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
