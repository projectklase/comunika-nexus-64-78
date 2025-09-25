import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostAttachment } from '@/types/post';
import { 
  Eye, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  File, 
  X,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentViewerProps {
  attachments: PostAttachment[];
  trigger?: React.ReactNode;
  showInline?: boolean;
}

export function AttachmentViewer({ 
  attachments, 
  trigger,
  showInline = false 
}: AttachmentViewerProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<PostAttachment | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return ImageIcon;
    if (ext === 'pdf') return FileText;
    return File;
  };

  const getFileTypeLabel = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'Imagem';
    if (ext === 'pdf') return 'PDF';
    return 'Arquivo';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleViewAttachment = (attachment: PostAttachment) => {
    setSelectedAttachment(attachment);
    setViewerOpen(true);
  };

  const handleDownload = (attachment: PostAttachment) => {
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

  const renderAttachment = (attachment: PostAttachment, index: number) => {
    const Icon = getFileIcon(attachment.name);
    const ext = attachment.name.split('.').pop()?.toLowerCase();
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
    const isPdf = ext === 'pdf';
    
    return (
      <div
        key={index}
        className="group relative p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* File preview/icon */}
          <div className="relative flex-shrink-0">
            {isImage ? (
              <div className="w-12 h-12 rounded-md overflow-hidden bg-muted border">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden w-full h-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-primary" />
              </div>
            )}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{attachment.name}</p>
              <Badge variant="outline" className="text-xs">
                {getFileTypeLabel(attachment.name)}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {attachment.size && (
                <span>{formatFileSize(attachment.size)}</span>
              )}
              
              <div className="flex items-center gap-1">
                <span>Clique para</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:underline"
                  onClick={() => handleViewAttachment(attachment)}
                >
                  visualizar
                </Button>
                <span>ou</span>
                <Button
                  variant="link" 
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:underline"
                  onClick={() => handleDownload(attachment)}
                >
                  baixar
                </Button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewAttachment(attachment)}
              className="h-8 w-8 p-0"
              aria-label={`Visualizar ${attachment.name}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(attachment)}
              className="h-8 w-8 p-0"
              aria-label={`Baixar ${attachment.name}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (showInline) {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium text-foreground mb-2">
          Anexos ({attachments.length})
        </div>
        
        <div className="space-y-2">
          {attachments.map(renderAttachment)}
        </div>

        {/* Viewer Modal */}
        <AttachmentViewerModal 
          attachment={selectedAttachment}
          isOpen={viewerOpen}
          onClose={() => {
            setViewerOpen(false);
            setSelectedAttachment(null);
          }}
        />
      </div>
    );
  }

  return (
    <>
      {trigger}
      
      <AttachmentViewerModal 
        attachment={selectedAttachment}
        isOpen={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedAttachment(null);
        }}
      />
    </>
  );
}

// Separate modal component for viewing attachments
interface AttachmentViewerModalProps {
  attachment: PostAttachment | null;
  isOpen: boolean;
  onClose: () => void;
}

function AttachmentViewerModal({ attachment, isOpen, onClose }: AttachmentViewerModalProps) {
  if (!attachment) return null;

  const ext = attachment.name.split('.').pop()?.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  const isPdf = ext === 'pdf';

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
                    {attachment.size < 1024 ? `${attachment.size} B` : 
                     attachment.size < 1024 * 1024 ? `${(attachment.size / 1024).toFixed(1)} KB` :
                     `${(attachment.size / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = attachment.url;
                  link.download = attachment.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 pt-0">
          {isImage ? (
            <div className="flex items-center justify-center">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error('Image load error:', e);
                }}
              />
            </div>
          ) : isPdf ? (
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
              <h3 className="text-lg font-medium mb-2">Visualização não disponível</h3>
              <p className="text-muted-foreground mb-4">
                Este tipo de arquivo não pode ser visualizado diretamente no navegador.
              </p>
              <Button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = attachment.url;
                  link.download = attachment.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}