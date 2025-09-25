import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Holiday } from '@/utils/br-holidays';
import { Calendar, AlertTriangle } from 'lucide-react';

interface HolidayWarningDialogProps {
  open: boolean;
  holiday: Holiday | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function HolidayWarningDialog({ 
  open, 
  holiday, 
  onConfirm, 
  onCancel 
}: HolidayWarningDialogProps) {
  if (!holiday) return null;

  // Parse date as local date to avoid timezone issues
  const [year, month, day] = holiday.date.split('-').map(Number);
  const holidayDate = new Date(year, month - 1, day);
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const formattedDate = holidayDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: userTimezone
  });

  const typeLabels = {
    national: 'Feriado Nacional',
    civic: 'Feriado Cívico',
    religious: 'Feriado Religioso'
  };

  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Data é um feriado nacional
              </AlertDialogTitle>
            </div>
          </div>
          <AlertDialogDescription className="text-left space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="text-sm font-medium text-foreground">
                {holiday.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {typeLabels[holiday.type]}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Você está criando um post para um feriado nacional. 
              Deseja prosseguir com esta data?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Alterar data
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-amber-600 hover:bg-amber-700">
            Prosseguir mesmo assim
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}