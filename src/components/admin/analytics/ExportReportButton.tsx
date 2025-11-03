import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAdminAnalytics } from '@/hooks/useAdminAnalytics';
import { useWeeklyHeatmap } from '@/hooks/useWeeklyHeatmap';
import { useRetentionMetrics } from '@/hooks/useRetentionMetrics';
import { useOperationalMetrics } from '@/hooks/useOperationalMetrics';
import { usePulseScore } from '@/hooks/usePulseScore';
import { usePostReadAnalytics } from '@/hooks/usePostReadAnalytics';
import { generateAnalyticsReport } from '@/utils/excel-export';

interface ExportReportButtonProps {
  daysFilter: number;
}

export function ExportReportButton({ daysFilter }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Carregar todos os dados necessários
  const { data: analytics, isLoading: loadingAnalytics } = useAdminAnalytics(daysFilter);
  const { data: heatmapData, isLoading: loadingHeatmap } = useWeeklyHeatmap(daysFilter);
  const { data: retentionData, isLoading: loadingRetention } = useRetentionMetrics(daysFilter);
  const { data: operationalData, isLoading: loadingOperational } = useOperationalMetrics();
  const { data: pulseData, isLoading: loadingPulse } = usePulseScore(daysFilter);
  const { data: postReadData, isLoading: loadingPostRead } = usePostReadAnalytics(daysFilter);

  const isLoadingAny = loadingAnalytics || loadingHeatmap || loadingRetention || 
                       loadingOperational || loadingPulse || loadingPostRead;

  const handleExport = async () => {
    // Validar se todos os dados estão carregados
    if (isLoadingAny) {
      toast({
        title: 'Aguarde',
        description: 'Carregando dados para exportação...',
        variant: 'default'
      });
      return;
    }

    if (!analytics || !heatmapData || !retentionData || !operationalData || !pulseData || !postReadData) {
      toast({
        title: 'Dados incompletos',
        description: 'Alguns dados ainda não foram carregados. Aguarde um momento.',
        variant: 'default'
      });
      return;
    }

    setIsExporting(true);
    
    try {
      await generateAnalyticsReport({
        analytics,
        heatmapData,
        retentionData,
        operationalData,
        pulseData,
        postReadData,
        daysFilter
      });

      toast({
        title: 'Relatório gerado!',
        description: 'O arquivo Excel foi baixado com sucesso.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao gerar o relatório. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting || isLoadingAny}
      variant="outline"
      size="default"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando...
        </>
      ) : isLoadingAny ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando dados...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Exportar Relatório Excel
        </>
      )}
    </Button>
  );
}
