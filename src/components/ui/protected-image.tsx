import { cn } from '@/lib/utils';
import { ImgHTMLAttributes, useRef, useCallback } from 'react';

interface ProtectedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'draggable'> {
  src: string;
  alt: string;
  wrapperClassName?: string;
}

export function ProtectedImage({ 
  src, 
  alt, 
  className,
  wrapperClassName,
  ...props 
}: ProtectedImageProps) {
  const touchTimerRef = useRef<number | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    return false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Block long-press context menu on mobile
    touchTimerRef.current = window.setTimeout(() => {
      e.preventDefault();
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  }, []);

  return (
    <div 
      className={cn("protected-image-wrapper relative select-none", wrapperClassName)}
      onContextMenu={handleContextMenu}
    >
      <img
        src={src}
        alt={alt}
        className={cn("protected-image", className)}
        draggable={false}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        {...props}
      />
      {/* Invisible overlay to capture events and block interactions */}
      <div 
        className="absolute inset-0 z-10"
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
}
