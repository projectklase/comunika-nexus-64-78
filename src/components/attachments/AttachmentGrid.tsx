import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttachmentPreview } from './AttachmentPreview';
import { PostAttachment } from '@/types/post';
import { 
  Image as ImageIcon, 
  File, 
  Download,
  ExternalLink,
  Eye
} from 'lucide-react';

interface AttachmentGridProps {
  attachments: PostAttachment[];
  postTitle?: string;
  showDetails?: boolean;
}

export function AttachmentGrid({ attachments, postTitle, showDetails = false }: AttachmentGridProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Separar imagens e PDFs
  const images = attachments.filter(att => 
    att.url?.startsWith('data:image/') || 
    (att.name && /\.(jpg|jpeg|png|webp)$/i.test(att.name))
  );
  
  const pdfs = attachments.filter(att => 
    att.url?.startsWith('data:application/pdf') ||
    (att.name && /\.pdf$/i.test(att.name))
  );

  const handlePreview = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewIndex(null);
  }, []);

  const handlePdfClick = useCallback((pdf: PostAttachment) => {
    if (pdf.url) {
      // Se for data URL, abrir em nova aba
      if (pdf.url.startsWith('data:')) {
        const win = window.open();
        if (win) {
          win.document.write(`
            <html>
              <head><title>${pdf.name}</title></head>
              <body style="margin:0;">
                <embed src="${pdf.url}" width="100%" height="100%" type="application/pdf">
              </body>
            </html>
          `);
        }
      } else {
        // Se for URL externa, abrir diretamente
        window.open(pdf.url, '_blank');
      }
    }
  }, []);

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Grid de Imagens */}
      {images.length > 0 && (
        <div className="space-y-2">
          {showDetails && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span>Imagens ({images.length})</span>
            </div>
          )}
          
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 3).map((image, index) => (
              <button
                key={index}
                onClick={() => handlePreview(index)}
                className="relative aspect-square bg-accent/20 rounded-lg border border-border/30 overflow-hidden hover:border-primary/50 transition-all duration-200 hover:scale-[1.02] group"
              >
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-primary/60" />
                  </div>
                )}
                
                {index === 2 && images.length > 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white font-medium text-sm">
                      +{images.length - 3}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de PDFs */}
      {pdfs.length > 0 && (
        <div className="space-y-2">
          {showDetails && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>Documentos ({pdfs.length})</span>
            </div>
          )}
          
          <div className="space-y-1">
            {pdfs.map((pdf, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <File className="h-4 w-4 text-orange-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {pdf.name}
                  </p>
                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-400 border-orange-500/30">
                    PDF
                  </Badge>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(pdfs.indexOf(pdf) + images.length)}
                    className="h-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                    title="Visualizar PDF"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePdfClick(pdf)}
                    className="h-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
                    title="Abrir em nova aba"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fallback para anexos simples */}
      {images.length === 0 && pdfs.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <File className="h-4 w-4" />
          <span>{attachments.length} anexo(s)</span>
        </div>
      )}

      {/* Modal de Visualização Unificado */}
      {previewIndex !== null && (
        <AttachmentPreview
          attachments={attachments}
          initialIndex={previewIndex}
          isOpen={previewIndex !== null}
          onClose={handleClosePreview}
          postTitle={postTitle}
        />
      )}
    </div>
  );
}