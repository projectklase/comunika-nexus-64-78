import { useState } from 'react';
import { useCardEvents } from '@/hooks/useCardEvents';
import { CardEvent, getEventStatus, EventStatus } from '@/types/card-events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CalendarDays,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Sparkles,
  Ghost,
  Snowflake,
  Heart,
  Sun,
  Star,
  Zap,
  Flame,
  Moon,
  Gift,
  PartyPopper,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const AVAILABLE_ICONS = [
  { name: 'Ghost', icon: Ghost, label: 'Halloween' },
  { name: 'Snowflake', icon: Snowflake, label: 'Inverno' },
  { name: 'Heart', icon: Heart, label: 'Dia dos Namorados' },
  { name: 'Sun', icon: Sun, label: 'Verão' },
  { name: 'Star', icon: Star, label: 'Natal' },
  { name: 'Zap', icon: Zap, label: 'Especial' },
  { name: 'Flame', icon: Flame, label: 'Fogo' },
  { name: 'Moon', icon: Moon, label: 'Noite' },
  { name: 'Gift', icon: Gift, label: 'Presente' },
  { name: 'PartyPopper', icon: PartyPopper, label: 'Festa' },
  { name: 'Sparkles', icon: Sparkles, label: 'Magia' },
];

const STATUS_COLORS: Record<EventStatus, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ended: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const STATUS_LABELS: Record<EventStatus, string> = {
  upcoming: 'Agendado',
  active: 'Ativo',
  ended: 'Encerrado',
};

export default function PlatformCardEvents() {
  const { events, eventsLoading, createEvent, updateEvent, deleteEvent, toggleEventActive } = useCardEvents();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CardEvent | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CardEvent | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    theme_color: '#FF6600',
    icon_name: 'Sparkles',
    event_pack_name: 'Pacote Especial',
    starts_at: '',
    ends_at: '',
    is_active: true,
    show_in_collection: false,
  });

  const handleOpenForm = (event?: CardEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        slug: event.slug,
        description: event.description || '',
        theme_color: event.theme_color || '#FF6600',
        icon_name: event.icon_name || 'Sparkles',
        event_pack_name: event.event_pack_name || 'Pacote Especial',
        starts_at: event.starts_at.slice(0, 16),
        ends_at: event.ends_at.slice(0, 16),
        is_active: event.is_active,
        show_in_collection: event.show_in_collection,
      });
    } else {
      setEditingEvent(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        theme_color: '#FF6600',
        icon_name: 'Sparkles',
        event_pack_name: 'Pacote Especial',
        starts_at: '',
        ends_at: '',
        is_active: true,
        show_in_collection: false,
      });
    }
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    const payload = {
      ...formData,
      starts_at: new Date(formData.starts_at).toISOString(),
      ends_at: new Date(formData.ends_at).toISOString(),
    };

    if (editingEvent) {
      await updateEvent.mutateAsync({ id: editingEvent.id, data: payload });
    } else {
      await createEvent.mutateAsync(payload);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteEvent.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const getIconComponent = (iconName: string) => {
    const found = AVAILABLE_ICONS.find(i => i.name === iconName);
    return found?.icon || Sparkles;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Eventos de Cartas
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie eventos sazonais com cartas de edição limitada
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      {/* Events Grid */}
      {eventsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : events.length === 0 ? (
        <Card className="bg-card/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum evento criado</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Crie eventos sazonais como Halloween, Natal ou Férias para disponibilizar cartas de edição limitada.
            </p>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => {
            const status = getEventStatus(event);
            const IconComponent = getIconComponent(event.icon_name || 'Sparkles');
            
            return (
              <Card 
                key={event.id} 
                className="bg-card/50 overflow-hidden"
                style={{ borderColor: event.theme_color + '40' }}
              >
                <div 
                  className="h-2"
                  style={{ backgroundColor: event.theme_color }}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: event.theme_color + '20' }}
                      >
                        <IconComponent 
                          className="w-5 h-5" 
                          style={{ color: event.theme_color }}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{event.name}</CardTitle>
                        <code className="text-xs text-muted-foreground">
                          {event.slug}
                        </code>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenForm(event)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => toggleEventActive.mutate({ 
                            eventId: event.id, 
                            isActive: !event.is_active 
                          })}
                        >
                          {event.is_active ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirm(event)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-xs', STATUS_COLORS[status])}>
                      {STATUS_LABELS[status]}
                    </Badge>
                    {!event.is_active && (
                      <Badge variant="outline" className="text-xs">
                        Desativado
                      </Badge>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Início:</span>
                      {format(new Date(event.starts_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Fim:</span>
                      {format(new Date(event.ends_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Editar Evento' : 'Novo Evento'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Evento</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      slug: editingEvent ? prev.slug : generateSlug(e.target.value)
                    }));
                  }}
                  placeholder="Ex: Halloween 2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (identificador único)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="halloween-2025"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do evento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event_pack_name">Nome do Pacote de Evento</Label>
                <Input
                  id="event_pack_name"
                  value={formData.event_pack_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, event_pack_name: e.target.value }))}
                  placeholder="Ex: Pacote Fantasma"
                />
                <p className="text-xs text-muted-foreground">
                  Nome exibido na loja de pacotes (8000 XP, 100% carta de evento)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Data de Início</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, starts_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">Data de Fim</Label>
                  <Input
                    id="ends_at"
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) => setFormData(prev => ({ ...prev, ends_at: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cor do Tema</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.theme_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <Input
                    value={formData.theme_color}
                    onChange={(e) => setFormData(prev => ({ ...prev, theme_color: e.target.value }))}
                    className="flex-1"
                    placeholder="#FF6600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ícone do Evento</Label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map(({ name, icon: Icon, label }) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, icon_name: name }))}
                      className={cn(
                        "p-2 rounded-lg border transition-all flex items-center justify-center",
                        formData.icon_name === name
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

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Evento Ativo</Label>
                  <p className="text-xs text-muted-foreground">
                    Cartas aparecem nos packs durante o período
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Mostrar na Galeria</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir cartas na galeria mesmo fora do evento
                  </p>
                </div>
                <Switch
                  checked={formData.show_in_collection}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, show_in_collection: checked }))}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.name || !formData.slug || !formData.starts_at || !formData.ends_at}
            >
              {editingEvent ? 'Salvar' : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{deleteConfirm?.name}"? 
              As cartas vinculadas serão desvinculadas, mas não excluídas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
