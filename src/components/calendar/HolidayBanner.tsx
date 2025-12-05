import { Sparkles, PartyPopper } from 'lucide-react';
import { Holiday } from '@/utils/br-holidays';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HolidayBannerProps {
  holiday: Holiday;
}

const holidayConfig = {
  national: {
    emoji: '🇧🇷',
    label: 'Feriado Nacional',
    gradient: 'from-emerald-500/20 via-yellow-500/15 to-emerald-500/20',
    border: 'border-emerald-500/40',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  civic: {
    emoji: '🏛️',
    label: 'Feriado Cívico',
    gradient: 'from-blue-500/20 via-sky-500/15 to-blue-500/20',
    border: 'border-blue-500/40',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  religious: {
    emoji: '⛪',
    label: 'Feriado Religioso',
    gradient: 'from-purple-500/20 via-violet-500/15 to-purple-500/20',
    border: 'border-purple-500/40',
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
};

// Mensagens especiais para feriados específicos
const holidayMessages: Record<string, string> = {
  'Confraternização Universal': '🎆 Feliz Ano Novo! Um novo ano de aprendizado nos espera.',
  'Natal': '🎄 Feliz Natal! Aproveite o momento com a família.',
  'Tiradentes': '🦁 Homenagem ao mártir da Inconfidência Mineira.',
  'Dia do Trabalhador': '👷 Dia de celebrar o valor do trabalho!',
  'Independência do Brasil': '🎺 Viva a independência do Brasil!',
  'Nossa Senhora Aparecida': '🙏 Padroeira do Brasil - dia de fé e devoção.',
  'Finados': '🕯️ Dia de lembrar com carinho de quem partiu.',
  'Proclamação da República': '📜 Marco histórico da nossa república.',
};

export function HolidayBanner({ holiday }: HolidayBannerProps) {
  const config = holidayConfig[holiday.type];
  const message = holidayMessages[holiday.name] || '📅 Dia de descanso e reflexão.';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-4 mb-4',
        'bg-gradient-to-r backdrop-blur-sm',
        'border-2 shadow-lg',
        config.gradient,
        config.border,
        'animate-in fade-in slide-in-from-top-2 duration-500'
      )}
    >
      {/* Sparkle decorations */}
      <div className="absolute top-2 right-2 opacity-60">
        <Sparkles className={cn('h-5 w-5 animate-pulse', config.iconColor)} />
      </div>
      <div className="absolute bottom-2 left-2 opacity-40">
        <PartyPopper className={cn('h-4 w-4', config.iconColor)} />
      </div>

      <div className="flex items-center gap-4">
        {/* Emoji grande */}
        <div className="text-5xl shrink-0 animate-bounce" style={{ animationDuration: '2s' }}>
          {config.emoji}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-foreground">
              {holiday.name}
            </h3>
          </div>
          
          <Badge 
            variant="outline" 
            className={cn('text-xs mb-2', config.badgeClass)}
          >
            {config.label}
          </Badge>
          
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
