import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { HeadphonesIcon, Send, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Clock, Paperclip, X, FileText, Image as ImageIcon, File, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSchool } from '@/contexts/SchoolContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SupportTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FileAttachment {
  file: File;
  id: string;
  preview?: string;
}

const priorityOptions = [
  { value: 'normal', label: 'Normal', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
  { value: 'high', label: 'Alta', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  { value: 'urgent', label: 'Urgente', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
];

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type === 'application/pdf') return FileText;
  return File;
};

export function SupportTicketModal({ open, onOpenChange, onSuccess }: SupportTicketModalProps) {
  const { user } = useAuth();
  const { currentSchool } = useSchool();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxDescriptionLength = 2000;

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: FileAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (attachments.length + newAttachments.length >= MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos permitidos`);
        break;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`Tipo de arquivo não suportado: ${file.name}`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande: ${file.name} (máx: 10MB)`);
        continue;
      }

      const attachment: FileAttachment = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      if (file.type.startsWith('image/')) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    }

    setAttachments(prev => [...prev, ...newAttachments]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const updated = prev.filter(a => a.id !== id);
      const removed = prev.find(a => a.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const uploadAttachments = async (ticketId: string) => {
    const uploadedAttachments: { file_name: string; file_url: string; file_type: string; file_size: number }[] = [];

    for (const attachment of attachments) {
      const filePath = `${user?.id}/${ticketId}/${attachment.id}-${attachment.file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('support-attachments')
        .upload(filePath, attachment.file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from('support-attachments')
        .getPublicUrl(filePath);

      uploadedAttachments.push({
        file_name: attachment.file.name,
        file_url: filePath,
        file_type: attachment.file.type,
        file_size: attachment.file.size,
      });
    }

    if (uploadedAttachments.length > 0) {
      const { error: insertError } = await supabase
        .from('support_ticket_attachments')
        .insert(
          uploadedAttachments.map(a => ({
            ticket_id: ticketId,
            uploaded_by: user?.id,
            ...a,
          }))
        );

      if (insertError) {
        console.error('Error saving attachments:', insertError);
      }
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim()) {
      toast.error('Por favor, informe o assunto');
      return;
    }
    if (!description.trim()) {
      toast.error('Por favor, descreva sua solicitação');
      return;
    }
    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: ticketData, error } = await supabase.from('support_tickets').insert({
        admin_id: user.id,
        school_id: currentSchool?.id || null,
        subject: subject.trim(),
        description: description.trim(),
        priority,
        status: 'open',
      }).select('id').single();

      if (error) throw error;

      if (attachments.length > 0 && ticketData?.id) {
        await uploadAttachments(ticketData.id);
      }

      setIsSuccess(true);
      toast.success('Ticket enviado com sucesso! Nossa equipe entrará em contato em breve.');
      
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
        onSuccess?.();
      }, 1500);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao enviar ticket. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubject('');
    setDescription('');
    setPriority('normal');
    attachments.forEach(a => a.preview && URL.revokeObjectURL(a.preview));
    setAttachments([]);
    setIsSuccess(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-purple-500/30 shadow-2xl shadow-purple-500/10 max-w-lg animate-in fade-in-0 zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
              <HeadphonesIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">Novo Ticket de Suporte</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Nossa equipe responderá em até 24 horas úteis
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4 animate-in fade-in-0 zoom-in-95 duration-300">
            <div className="p-4 rounded-full bg-green-500/20 border border-green-500/30">
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Ticket Enviado!</p>
              <p className="text-sm text-muted-foreground mt-1">Entraremos em contato em breve</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 py-2">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                Assunto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="Ex: Dúvida sobre funcionalidade, Problema técnico..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background/50 border-border/50 focus:border-purple-500/50 transition-colors"
                autoFocus
                disabled={isSubmitting}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade</Label>
              <RadioGroup
                value={priority}
                onValueChange={setPriority}
                className="flex gap-3"
                disabled={isSubmitting}
              >
                {priorityOptions.map((option) => (
                  <Label
                    key={option.value}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200',
                      priority === option.value
                        ? option.bg
                        : 'bg-background/30 border-border/50 hover:bg-accent/30'
                    )}
                  >
                    <RadioGroupItem value={option.value} className="sr-only" />
                    <option.icon className={cn('h-4 w-4', priority === option.value ? option.color : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', priority === option.value ? option.color : 'text-muted-foreground')}>
                      {option.label}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descrição <span className="text-destructive">*</span>
                </Label>
                <span className={cn(
                  'text-xs',
                  description.length > maxDescriptionLength * 0.9 ? 'text-orange-400' : 'text-muted-foreground'
                )}>
                  {description.length}/{maxDescriptionLength}
                </span>
              </div>
              <Textarea
                id="description"
                placeholder="Descreva detalhadamente sua solicitação, dúvida ou problema. Quanto mais informações, mais rápido poderemos ajudar..."
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, maxDescriptionLength))}
                className="min-h-[120px] bg-background/50 border-border/50 focus:border-purple-500/50 transition-colors resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                Anexos (opcional)
              </Label>
              
              {/* Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200',
                  isDragging 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-border/50 hover:border-purple-500/50 hover:bg-purple-500/5',
                  attachments.length >= MAX_FILES && 'opacity-50 cursor-not-allowed'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={ALLOWED_TYPES.join(',')}
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  disabled={isSubmitting || attachments.length >= MAX_FILES}
                />
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Arraste arquivos aqui ou <span className="text-purple-400">clique para selecionar</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Máx: {MAX_FILES} arquivos, 10MB cada • Imagens, PDF, DOC
                </p>
              </div>

              {/* Attachments List */}
              {attachments.length > 0 && (
                <div className="space-y-2 mt-3">
                  {attachments.map((attachment) => {
                    const FileIcon = getFileIcon(attachment.file.type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-background/50 border border-border/50"
                      >
                        {attachment.preview ? (
                          <img
                            src={attachment.preview}
                            alt={attachment.file.name}
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.file.size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAttachment(attachment.id);
                          }}
                          disabled={isSubmitting}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !subject.trim() || !description.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Ticket
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
