import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostAttachment } from '@/types/post';
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachments: PostAttachment[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  postTitle?: string;
}

export function AttachmentPreview({ 
  attachments, 
  initialIndex, 
  isOpen, 
  onClose, 
  postTitle 
}: AttachmentPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  
  // Reset states when modal opens or initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, attachments.length - 1)));
      setImageScale(1);
      setImageRotation(0);
    }
  }, [isOpen, initialIndex, attachments.length]);
  
  const currentAttachment = attachments[currentIndex];
  
  if (!currentAttachment) return null;

  const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(currentAttachment.name);
  const isPDF = /\.pdf$/i.test(currentAttachment.name);
  
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
    resetImageTransform();
  }, [attachments.length]);
  
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
    resetImageTransform();
  }, [attachments.length]);
  
  const resetImageTransform = useCallback(() => {
    setImageScale(1);
    setImageRotation(0);
  }, []);
  
  const zoomIn = useCallback(() => setImageScale(prev => Math.min(prev * 1.2, 5)), []);
  const zoomOut = useCallback(() => setImageScale(prev => Math.max(prev / 1.2, 0.1)), []);
  const rotate = useCallback(() => setImageRotation(prev => (prev + 90) % 360), []);
  
  const downloadAttachment = useCallback(() => {
    if (currentAttachment.url) {
      const link = document.createElement('a');
      link.href = currentAttachment.url;
      link.download = currentAttachment.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentAttachment]);

  const openInNewTab = useCallback(() => {
    if (currentAttachment.url) {
      window.open(currentAttachment.url, '_blank');
    }
  }, [currentAttachment]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
          e.preventDefault();
          zoomOut();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          rotate();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, goToPrevious, goToNext, onClose, zoomIn, zoomOut, rotate]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Tamanho desconhecido';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only close if explicitly requested
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] h-[95vh] sm:h-auto p-0 bg-black/95 border-border/50 flex flex-col">
        <DialogHeader className="p-4 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground truncate">
                {currentAttachment.name}
              </DialogTitle>
              {postTitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  De: {postTitle}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-4">
              {attachments.length > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {currentIndex + 1} de {attachments.length}
                </Badge>
              )}
              
              <div className="flex items-center gap-1">
                {isImage && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={zoomOut}
                      disabled={imageScale <= 0.1}
                      className="h-8 w-8 p-0"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={zoomIn}
                      disabled={imageScale >= 5}
                      className="h-8 w-8 p-0"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={rotate}
                      className="h-8 w-8 p-0"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openInNewTab}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadAttachment}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* Navigation arrows */}
          {attachments.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}
          
          <div className="h-full max-h-[calc(95vh-160px)] sm:max-h-[calc(95vh-140px)] flex items-center justify-center p-2 sm:p-4 overflow-auto">
            {isImage ? (
              <img
                src={currentAttachment.url}
                alt={currentAttachment.name}
                className="max-w-full max-h-[calc(95vh-180px)] sm:max-h-[calc(95vh-160px)] object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`
                }}
                draggable={false}
              />
            ) : isPDF ? (
              <div className="w-full h-full min-h-[600px]">
                <iframe
                  src={currentAttachment.url}
                  title={currentAttachment.name}
                  className="w-full h-full border-0 rounded-lg"
                />
              </div>
            ) : (
              <div className="text-center space-y-4">
                <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium text-foreground">
                    {currentAttachment.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(currentAttachment.size)}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={openInNewTab} className="flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Abrir em nova aba
                  </Button>
                  <Button variant="outline" onClick={downloadAttachment} className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with file info */}
        <div className="p-4 bg-gradient-to-r from-background/95 to-background/90 backdrop-blur-sm border-t border-border/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatFileSize(currentAttachment.size)}</span>
            {isImage && (
              <span>Zoom: {Math.round(imageScale * 100)}%</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}