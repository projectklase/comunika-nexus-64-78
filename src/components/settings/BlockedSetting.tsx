import { Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BlockedSettingProps {
  children: React.ReactNode;
  reason?: string;
  isBlocked?: boolean;
}

export function BlockedSetting({ 
  children, 
  reason = "Esta configuração estará disponível em breve",
  isBlocked = true 
}: BlockedSettingProps) {
  if (!isBlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <Alert className="mt-2">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {reason}
        </AlertDescription>
      </Alert>
    </div>
  );
}