import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface ImpersonationBannerProps {
  adminName: string;
  adminEmail: string;
  onExit: () => void;
}

export function ImpersonationBanner({ adminName, adminEmail, onExit }: ImpersonationBannerProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 backdrop-blur text-amber-950 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">
            Modo Visualização: {adminName} ({adminEmail})
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="bg-white/20 border-amber-950/30 hover:bg-white/30"
          onClick={onExit}
        >
          <X className="h-4 w-4 mr-1" />
          Sair
        </Button>
      </div>
    </div>
  );
}
