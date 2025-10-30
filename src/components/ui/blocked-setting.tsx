import React from 'react';
import { Lock, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BlockedSettingProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  type?: 'switch' | 'select' | 'custom';
  placeholder?: string;
  children?: React.ReactNode;
  className?: string;
  reason?: string;
  learnMoreContent?: React.ReactNode;
  onClick?: () => void;
}

export function BlockedSetting({
  title,
  description,
  icon,
  type = 'switch',
  placeholder,
  children,
  className,
  reason = "Recurso disponível em versões futuras",
  learnMoreContent,
  onClick
}: BlockedSettingProps) {
  const renderControl = () => {
    switch (type) {
      case 'switch':
        return (
          <Switch
            disabled
            checked={false}
            aria-disabled="true"
          />
        );
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger className="opacity-50 cursor-not-allowed">
              <SelectValue placeholder={placeholder || "Selecione uma opção"} />
            </SelectTrigger>
          </Select>
        );
      default:
        return children;
    }
  };

  return (
    <Card className={cn("bg-background/30 backdrop-blur-sm border-muted", className)} onClick={onClick}>
      <CardContent className="flex items-center justify-between p-4 opacity-60">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            {icon}
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {title}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Em breve</p>
                </TooltipContent>
              </Tooltip>
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
            {learnMoreContent && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary/70 hover:text-primary">
                    <Info className="h-3 w-3 mr-1" />
                    Saiba mais
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {title}
                    </DialogTitle>
                    <DialogDescription>
                      {reason}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {learnMoreContent}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <p className="text-xs text-muted-foreground/80 font-medium">
            {reason}
          </p>
        </div>
        <div className="ml-4">
          {renderControl()}
        </div>
      </CardContent>
    </Card>
  );
}