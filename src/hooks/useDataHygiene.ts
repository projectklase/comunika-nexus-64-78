import { useEffect } from 'react';
import { runDataHygiene, getLastHygieneReport, HygieneReport } from '@/lib/data-hygiene';
import { useToast } from '@/hooks/use-toast';

export function useDataHygiene() {
  const { toast } = useToast();

  useEffect(() => {
    // Check if we need to run data hygiene
    const lastReport = getLastHygieneReport();
    const shouldRun = !lastReport || isOutdated(lastReport);

    if (shouldRun) {
      const report = runDataHygiene();
      
      if (report.totalErrors === -1) {
        console.error('Data hygiene failed');
        return;
      }

      const hasChanges = report.phonesFixed > 0 || 
                        report.datesAdjusted > 0 || 
                        report.titlesTrimmed > 0 || 
                        report.textsClipped > 0;

      if (hasChanges) {
        toast({
          title: "Dados higienizados",
          description: `Corrigimos automaticamente ${getTotalChanges(report)} itens nos seus dados.`,
          duration: 5000,
        });
      }
    }
  }, [toast]);

  return {
    getLastReport: getLastHygieneReport,
    runHygiene: () => {
      const report = runDataHygiene();
      if (report.totalErrors !== -1) {
        toast({
          title: "Higienização concluída",
          description: `Processamos seus dados com ${getTotalChanges(report)} correções.`,
        });
      }
      return report;
    }
  };
}

function isOutdated(report: HygieneReport): boolean {
  const reportDate = new Date(report.timestamp);
  const daysSinceReport = (Date.now() - reportDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceReport > 7; // Run weekly
}

function getTotalChanges(report: HygieneReport): number {
  return report.phonesFixed + report.datesAdjusted + report.titlesTrimmed + report.textsClipped;
}