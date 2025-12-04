import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { MoreVertical, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface GameDeckCardProps {
  name: string;
  cardCount: number;
  isFavorite?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  children?: ReactNode;
  delay?: number;
}

export function GameDeckCard({ 
  name, 
  cardCount, 
  isFavorite,
  onEdit,
  onDelete,
  children,
  delay = 0 
}: GameDeckCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: 'easeOut' }}
      className="relative group min-w-[260px]"
    >
      {/* Gradient border */}
      <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-br from-violet-500/30 via-purple-500/30 to-pink-500/30 opacity-50 group-hover:opacity-100 transition-opacity duration-300 blur-[1px]" />
      
      {/* Card content */}
      <div className="relative rounded-xl backdrop-blur-md overflow-hidden bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-white/10">
        {/* Header */}
        <div className="p-4 pb-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0">
            {isFavorite && (
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 flex-shrink-0 drop-shadow-[0_0_4px_rgba(250,204,21,0.5)]" />
            )}
            <h3 className="font-bold text-foreground truncate">{name}</h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 flex-shrink-0 hover:bg-white/10"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-white/10">
              <DropdownMenuItem onClick={onEdit}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="p-4 pt-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-sm font-medium text-foreground/80">{cardCount} cartas</span>
            </div>
          </div>

          {/* Card preview - children slot */}
          <div className="flex gap-1">
            {children}
          </div>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        </div>
      </div>
    </motion.div>
  );
}
