import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileX, AlertTriangle, Clock } from 'lucide-react';
import { Post } from '@/types/post';
import { DeliveryAttachment } from '@/types/delivery';
import { deliveryStore } from '@/stores/delivery-store';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface DrawerEntregaProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Post;
  classId: string;
  onSuccess?: () => void;
}

const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = {
  'image/jpeg': 4,
  'image/png': 4,
  'image/webp': 4,
  'application/pdf': 6
};
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

export function DrawerEntrega({ isOpen, onClose, activity, classId, onSuccess }: DrawerEntregaProps) {
  const { user } = useAuth();
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<DeliveryAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  if (!user) return null;

  const isOverdue = activity.dueAt ? new Date() > new Date(activity.dueAt) : false;

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Tipo de arquivo não permitido: ${file.name}`;
    }

    // Check file size
    const maxSizeMB = MAX_FILE_SIZE_MB[file.type as keyof typeof MAX_FILE_SIZE_MB];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return `Arquivo muito grande: ${file.name} (máx. ${maxSizeMB}MB)`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newErrors: string[] = [];
    const validFiles: File[] = [];

    // Check total file count
    if (attachments.length + files.length > MAX_FILES) {
      newErrors.push(`Máximo de ${MAX_FILES} arquivos permitidos`);
      setErrors(newErrors);
      return;
    }

    // Validate each file
    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    // Add valid files
    const newAttachments: DeliveryAttachment[] = validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      // In production, you would upload the file and get the URL
      url: URL.createObjectURL(file)
    }));

    setAttachments(prev => [...prev, ...newAttachments]);
    setErrors([]);
    
    // Clear input
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Convert file URLs to base64 data URLs for persistent storage
      const processedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          if (attachment.url?.startsWith('blob:')) {
            try {
              const response = await fetch(attachment.url);
              const blob = await response.blob();
              const reader = new FileReader();
              return new Promise<typeof attachment>((resolve) => {
                reader.onload = () => {
                  resolve({
                    ...attachment,
                    url: reader.result as string
                  });
                };
                reader.readAsDataURL(blob);
              });
            } catch (error) {
              console.error('Error converting attachment to base64:', error);
              return attachment;
            }
          }
          return attachment;
        })
      );

      const delivery = deliveryStore.submit({
        postId: activity.id,
        studentId: user.id,
        studentName: user.name,
        classId,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
        notes: notes.trim() || undefined
      }, activity.dueAt);

      // Notify the teacher about the new submission
      const { notificationStore } = await import('@/stores/notification-store');
      notificationStore.add({
        type: 'POST_NEW',
        title: 'Nova entrega recebida',
        message: `O aluno ${user.name} entregou a atividade "${activity.title}".`,
        roleTarget: 'PROFESSOR',
        link: `/professor/turma/${classId}/atividade/${activity.id}`,
        meta: {
          activityId: activity.id,
          studentId: user.id,
          studentName: user.name,
          deliveryId: delivery.id,
          activityTitle: activity.title
        }
      });

      toast({
        title: isOverdue ? 'Entrega atrasada realizada' : 'Entrega realizada',
        description: isOverdue 
          ? 'Atividade marcada como entregue (fora do prazo)'
          : 'Atividade entregue com sucesso!'
      });

      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro ao entregar a atividade.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    setAttachments([]);
    setErrors([]);
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleClose}>
      <DrawerContent className="max-h-[95vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Entregar Atividade
          </DrawerTitle>
          <DrawerDescription>
            Envie sua atividade "{activity.title}" para avaliação do professor.
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-6 flex-1 overflow-y-auto space-y-6">
          {/* Overdue Warning */}
          {isOverdue && (
            <Alert className="border-orange-500/50 bg-orange-500/10">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-300">
                <strong>Atenção:</strong> O prazo para esta atividade já passou. Sua entrega será marcada como atrasada.
              </AlertDescription>
            </Alert>
          )}

          {/* Due Date Info */}
          {activity.dueAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
              <Clock className="h-4 w-4" />
              <span>
                Prazo: {new Date(activity.dueAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload" className="text-base font-medium">
                Anexar Arquivos
              </Label>
              <p className="text-sm text-muted-foreground mb-3">
                JPG, PNG, WEBP (máx. 4MB) • PDF (máx. 6MB) • Máximo {MAX_FILES} arquivos
              </p>
              
              <Input
                id="file-upload"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Alert className="border-destructive/50 bg-destructive/10">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription>
                  {errors.map((error, index) => (
                    <div key={index} className="text-destructive">{error}</div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* File List */}
            {attachments.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Arquivos Selecionados ({attachments.length}/{MAX_FILES})</h4>
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(attachment.size || 0)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {attachment.type?.includes('pdf') ? 'PDF' : 'Imagem'}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeAttachment(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <FileX className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre sua entrega..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        <DrawerFooter className="pt-6">
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading} 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? 'Enviando...' : 'Entregar Atividade'}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}