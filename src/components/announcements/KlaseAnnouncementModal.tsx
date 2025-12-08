import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Megaphone,
  Rocket,
  Gift,
  Zap,
  Bell,
  Star,
  PartyPopper,
  Sparkles,
  Heart,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Megaphone,
  Rocket,
  Gift,
  Zap,
  Bell,
  Star,
  PartyPopper,
  Sparkles,
  Heart,
  AlertTriangle,
};

interface Notification {
  id: string;
  title: string;
  message: string;
  meta?: unknown;
}

interface KlaseAnnouncementModalProps {
  notification: Notification;
  onClose: () => void;
}

export function KlaseAnnouncementModal({
  notification,
  onClose,
}: KlaseAnnouncementModalProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(true);

  const meta = notification.meta as Record<string, string> | undefined;
  const iconName = meta?.icon_name || 'Megaphone';
  const themeColor = meta?.theme_color || '#8B5CF6';
  const bannerUrl = meta?.banner_url;
  
  const IconComponent = ICON_MAP[iconName] || Megaphone;

  const markReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-platform-announcement'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleClose = () => {
    markReadMutation.mutate();
    setIsOpen(false);
    setTimeout(onClose, 300);
  };

  const Content = () => (
    <div className="relative overflow-hidden">
      {/* Animated gradient border effect */}
      <div
        className="absolute inset-0 opacity-20 animate-pulse"
        style={{
          background: `linear-gradient(135deg, ${themeColor}40, transparent, ${themeColor}20)`,
        }}
      />
      
      {/* Banner if exists */}
      {bannerUrl && (
        <div className="w-full h-32 sm:h-40 overflow-hidden">
          <img
            src={bannerUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="relative p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.5 }}
          className="relative"
        >
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl"
            style={{ 
              backgroundColor: themeColor,
              boxShadow: `0 0 60px ${themeColor}60`,
            }}
          >
            <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
          </div>
          
          {/* Pulse rings */}
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: themeColor }}
          />
        </motion.div>

        {/* Klase Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Badge 
            variant="outline" 
            className="px-4 py-1 text-xs font-semibold tracking-wider border-2"
            style={{ borderColor: themeColor, color: themeColor }}
          >
            ✨ NOVIDADE KLASE ✨
          </Badge>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-xl sm:text-2xl font-bold text-foreground"
        >
          {notification.title}
        </motion.h2>

        {/* Message */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground text-sm sm:text-base max-w-md leading-relaxed"
        >
          {notification.message}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="pt-4"
        >
          <Button
            size="lg"
            onClick={handleClose}
            className="px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-105"
            style={{ 
              backgroundColor: themeColor,
              boxShadow: `0 10px 40px ${themeColor}40`,
            }}
          >
            <Check className="w-5 h-5 mr-2" />
            Entendi
          </Button>
        </motion.div>

        {/* Klase Watermark */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 0.8 }}
          className="text-xs font-medium tracking-widest text-muted-foreground pt-4"
        >
          KLASE™
        </motion.p>
      </div>

      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ backgroundColor: themeColor }}
      />
      <div
        className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl opacity-15"
        style={{ backgroundColor: themeColor }}
      />
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent className="max-h-[85vh] bg-card/95 backdrop-blur-xl border-t-2" style={{ borderColor: themeColor }}>
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={cn(
          "max-w-md p-0 overflow-hidden bg-card/95 backdrop-blur-xl border-2",
          "shadow-2xl"
        )}
        style={{ borderColor: themeColor }}
      >
        <Content />
      </DialogContent>
    </Dialog>
  );
}
