import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeliveryAttachment } from '@/types/delivery';
import { 
  Eye, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  File, 
  X,
  AlertCircle
} from 'lucide-react';

interface AttachmentPreviewModalProps {
  attachment: DeliveryAttachment | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AttachmentPreviewModal({ attachment, isOpen, onClose }: AttachmentPreviewModalProps) {
  const [imageLoadError, setImageLoadError] = useState(false);

  if (!attachment) return null;

  const isImage = attachment.type?.includes('image/') || 
    ['jpg', 'jpeg', 'png', 'webp'].some(ext => 
      attachment.name.toLowerCase().endsWith(`.${ext}`)
    );
  const isPdf = attachment.type?.includes('pdf') || attachment.name.toLowerCase().endsWith('.pdf');

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    if (!attachment.url) return;
    
    try {
      const link = document.createElement('a');
      link.href = attachment.url;
      link.download = attachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold">
                {attachment.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {isImage ? 'Imagem' : isPdf ? 'PDF' : 'Arquivo'}
                </Badge>
                {attachment.size && (
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(attachment.size)}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {attachment.url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-0">
          {isImage && attachment.url ? (
            <div className="flex items-center justify-center">
              {imageLoadError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Erro ao carregar imagem</h3>
                  <p className="text-muted-foreground mb-4">
                    Não foi possível exibir esta imagem.
                  </p>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar arquivo
                  </Button>
                </div>
              ) : (
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  onError={() => setImageLoadError(true)}
                  onLoad={() => setImageLoadError(false)}
                />
              )}
            </div>
          ) : isPdf && attachment.url ? (
            <div className="w-full h-[60vh] border rounded-lg overflow-hidden">
              <iframe
                src={`${attachment.url}#toolbar=1&navpanes=1&scrollbar=1`}
                className="w-full h-full"
                title={attachment.name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <File className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {attachment.url ? 'Visualização não disponível' : 'Arquivo não disponível'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {attachment.url 
                  ? 'Este tipo de arquivo não pode ser visualizado diretamente no navegador.'
                  : 'O arquivo não está disponível para visualização.'
                }
              </p>
              {attachment.url && (
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar arquivo
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}