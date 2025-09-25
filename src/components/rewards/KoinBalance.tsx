import { Coins, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KoinBalanceProps {
  availableBalance: number;
  blockedBalance?: number;
  totalEarned?: number;
  isCompact?: boolean;
  showAnimation?: boolean;
}

export function KoinBalance({
  availableBalance,
  blockedBalance = 0,
  totalEarned = 0,
  isCompact = false,
  showAnimation = false
}: KoinBalanceProps) {
  const totalBalance = availableBalance + blockedBalance;

  if (isCompact) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-lg px-3 py-2">
        <Coins className={cn(
          "h-5 w-5 text-yellow-500",
          showAnimation && "animate-pulse"
        )} />
        <span className="font-bold text-lg text-foreground">
          {availableBalance}
        </span>
        <span className="text-sm text-muted-foreground">Koins</span>
        
        {blockedBalance > 0 && (
          <Badge variant="outline" className="text-xs ml-2">
            {blockedBalance} bloqueados
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="glass-card border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Main Balance */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className={cn(
                "h-8 w-8 text-yellow-500",
                showAnimation && "animate-pulse"
              )} />
              <span className="text-3xl font-bold text-foreground">
                {availableBalance}
              </span>
              <span className="text-lg text-muted-foreground">Koins</span>
            </div>
            <p className="text-sm text-muted-foreground">Disponível para resgatar</p>
          </div>

          {/* Additional Info */}
          {(blockedBalance > 0 || totalEarned > 0) && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              {blockedBalance > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Wallet className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-orange-500">
                      {blockedBalance}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Bloqueados</p>
                </div>
              )}
              
              {totalEarned > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-green-500">
                      {totalEarned}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Total Ganho</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}