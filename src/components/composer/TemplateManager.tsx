import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Save, 
  FileText, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Clock,
  TrendingUp
} from 'lucide-react';
import { useUserTemplates } from '@/hooks/useUserPreferences';
import { UserTemplate } from '@/services/user-preferences';
import { PostType } from '@/types/post';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemplateManagerProps {
  postType: PostType;
  currentData: {
    title: string;
    body: string;
    eventLocation?: string;
  };
  onApplyTemplate: (template: UserTemplate) => void;
  className?: string;
}

export function TemplateManager({ 
  postType, 
  currentData, 
  onApplyTemplate, 
  className 
}: TemplateManagerProps) {
  const { templates, saveTemplate, updateTemplate, deleteTemplate, useTemplate } = useUserTemplates();
  const { toast } = useToast();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<UserTemplate | null>(null);
  
  const filteredTemplates = templates.filter(t => t.type === postType);

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para o modelo.',
        variant: 'destructive'
      });
      return;
    }

    if (!currentData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'O título não pode estar vazio.',
        variant: 'destructive'
      });
      return;
    }

    const template = {
      name: templateName.trim(),
      type: postType,
      title: currentData.title,
      body: currentData.body,
      eventLocation: currentData.eventLocation,
      eventDuration: postType === 'EVENTO' ? 60 : undefined
    };

    if (editingTemplate) {
      const success = updateTemplate(editingTemplate.id, template);
      if (success) {
        toast({
          title: 'Modelo atualizado',
          description: `O modelo "${templateName}" foi atualizado com sucesso.`
        });
      }
    } else {
      const newTemplate = saveTemplate(template);
      if (newTemplate) {
        toast({
          title: 'Modelo salvo',
          description: `O modelo "${templateName}" foi salvo com sucesso.`
        });
      }
    }

    setShowSaveDialog(false);
    setTemplateName('');
    setEditingTemplate(null);
  };

  const handleApplyTemplate = (template: UserTemplate) => {
    useTemplate(template.id);
    onApplyTemplate(template);
    
    toast({
      title: 'Modelo aplicado',
      description: `O modelo "${template.name}" foi aplicado ao formulário.`
    });
  };

  const handleEditTemplate = (template: UserTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setShowSaveDialog(true);
  };

  const handleDeleteTemplate = (template: UserTemplate) => {
    const success = deleteTemplate(template.id);
    if (success) {
      toast({
        title: 'Modelo removido',
        description: `O modelo "${template.name}" foi removido.`
      });
    }
  };

  const getTypeIcon = (type: PostType) => {
    const icons = {
      'AVISO': '📢',
      'COMUNICADO': '📋',
      'EVENTO': '📅',
      'ATIVIDADE': '📝',
      'TRABALHO': '📄',
      'PROVA': '📊'
    };
    return icons[type] || '📄';
  };

  if (filteredTemplates.length === 0 && !currentData.title.trim()) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Modelos</Label>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Apply Template Buttons */}
        {filteredTemplates.map((template) => (
          <div key={template.id} className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApplyTemplate(template)}
              className="h-8 text-xs"
            >
              <span className="mr-1">{getTypeIcon(template.type)}</span>
              {template.name}
              {template.usageCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1">
                  {template.usageCount}
                </Badge>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                  <Edit2 className="h-3 w-3 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDeleteTemplate(template)}
                  className="text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Remover
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}

        {/* Save Template Button */}
        {currentData.title.trim() && (
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <Save className="h-3 w-3 mr-1" />
                Salvar modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Editar Modelo' : 'Salvar como Modelo'}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Nome do modelo</Label>
                  <Input
                    id="template-name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Ex: Reunião semanal, Prova bimestral..."
                    maxLength={50}
                  />
                </div>

                {/* Template Preview */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Preview:</Label>
                  <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <span>{getTypeIcon(postType)}</span>
                      <Badge variant="outline" className="text-xs">
                        {postType}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{currentData.title}</p>
                    {currentData.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {currentData.body}
                      </p>
                    )}
                    {currentData.eventLocation && (
                      <p className="text-xs text-muted-foreground">
                        📍 {currentData.eventLocation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSaveDialog(false);
                      setTemplateName('');
                      setEditingTemplate(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveTemplate}>
                    {editingTemplate ? 'Atualizar' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Templates Summary */}
      {filteredTemplates.length > 0 && (
        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {filteredTemplates.length} modelo(s)
          </span>
          
          {filteredTemplates.some(t => t.usageCount > 0) && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Mais usado: {Math.max(...filteredTemplates.map(t => t.usageCount))} vezes
            </span>
          )}
          
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Último: {format(
              new Date(Math.max(...filteredTemplates.map(t => new Date(t.createdAt).getTime()))),
              'dd/MM',
              { locale: ptBR }
            )}
          </span>
        </div>
      )}
    </div>
  );
}