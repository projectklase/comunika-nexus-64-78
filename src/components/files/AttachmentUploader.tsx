import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
}

interface AttachmentUploaderProps {
  value: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  maxFiles?: number;
}

const ALLOWED_TYPES = {
  'image/jpeg': { label: 'JPG', maxSize: 4 * 1024 * 1024 }, // 4MB
  'image/png': { label: 'PNG', maxSize: 4 * 1024 * 1024 },  // 4MB
  'image/webp': { label: 'WebP', maxSize: 4 * 1024 * 1024 }, // 4MB
  'application/pdf': { label: 'PDF', maxSize: 6 * 1024 * 1024 } // 6MB
};

export function AttachmentUploader({ value, onChange, maxFiles = 5 }: AttachmentUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1920;
        
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a File object from the blob
              const compressedFile = Object.assign(blob, {
                name: file.name,
                lastModified: Date.now(),
                webkitRelativePath: ""
              }) as File;
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.8
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const validateAndProcessFile = async (file: File): Promise<Attachment | null> => {
    // Check file type
    if (!Object.keys(ALLOWED_TYPES).includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Envie JPG/PNG/WebP ou PDF.",
        variant: "destructive"
      });
      return null;
    }

    const config = ALLOWED_TYPES[file.type as keyof typeof ALLOWED_TYPES];
    let processedFile = file;

    // Compress image if needed
    if (file.type.startsWith('image/')) {
      processedFile = await compressImage(file);
    }

    // Check file size
    if (processedFile.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      toast({
        title: "Arquivo muito grande",
        description: `${file.type.startsWith('image/') ? 'Imagens' : 'PDFs'} até ${maxSizeMB} MB.`,
        variant: "destructive"
      });
      return null;
    }

    // Create data URL for preview
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(processedFile);
    });

    return {
      id: generateId(),
      name: file.name,
      mime: file.type,
      size: processedFile.size,
      dataUrl: file.type.startsWith('image/') ? dataUrl : undefined
    };
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (value.length + files.length > maxFiles) {
      toast({
        title: "Muitos arquivos",
        description: `Máximo de ${maxFiles} anexos por post.`,
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const newAttachments: Attachment[] = [];

    for (const file of files) {
      const attachment = await validateAndProcessFile(file);
      if (attachment) {
        newAttachments.push(attachment);
      }
    }

    if (newAttachments.length > 0) {
      onChange([...value, ...newAttachments]);
    }

    setIsProcessing(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(value.filter(attachment => attachment.id !== id));
  };

  const isImage = (mime: string): boolean => mime.startsWith('image/');

  return (
    <div className="space-y-3">
      <Label>Anexos ({value.length}/{maxFiles})</Label>
      
      {/* Upload Button */}
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || value.length >= maxFiles}
          className="border-dashed"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isProcessing ? 'Processando...' : 'Adicionar Arquivo'}
        </Button>
        <span className="text-xs text-muted-foreground">
          JPG/PNG/WebP até 4MB, PDF até 6MB
        </span>
      </div>

      {/* Attachment List */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((attachment) => (
            <Card key={attachment.id} className="p-3 bg-accent/10 border-accent/20">
              <div className="flex items-start gap-3">
                {/* Preview/Icon */}
                <div className="flex-shrink-0">
                  {isImage(attachment.mime) && attachment.dataUrl ? (
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.name}
                      className="w-12 h-12 object-cover rounded border border-border/50"
                    />
                  ) : isImage(attachment.mime) ? (
                    <div className="w-12 h-12 bg-primary/20 rounded border border-primary/30 flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-primary" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-orange-500/20 rounded border border-orange-500/30 flex items-center justify-center">
                      <File className="h-6 w-6 text-orange-400" />
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={attachment.name}>
                    {attachment.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.size)} • {ALLOWED_TYPES[attachment.mime as keyof typeof ALLOWED_TYPES]?.label}
                  </p>
                </div>

                {/* Remove Button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(attachment.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}