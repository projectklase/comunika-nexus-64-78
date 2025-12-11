import { MoreVertical, ScrollText, Flag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface BattleContextMenuProps {
  onViewHistory: () => void;
  onForfeit: () => void;
  showingLog: boolean;
}

export const BattleContextMenu = ({
  onViewHistory,
  onForfeit,
  showingLog,
}: BattleContextMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-sm">
        <DropdownMenuItem onClick={onViewHistory} className="gap-2 cursor-pointer">
          <ScrollText className="h-4 w-4" />
          {showingLog ? "Ocultar Histórico" : "Ver Histórico"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onForfeit} 
          className="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <Flag className="h-4 w-4" />
          Desistir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
