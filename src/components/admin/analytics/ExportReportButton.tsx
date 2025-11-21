import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAnalyticsReport } from '@/utils/excel-export';
import { fetchCompleteAnalyticsData } from '@/utils/excel-data-fetcher';
import { useSchool } from '@/contexts/SchoolContext';

interface ExportReportButtonProps {
  daysFilter: number;
}

export function ExportReportButton({ daysFilter }: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { currentSchool } = useSchool();

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      toast({
        title: 'Buscando dados...',
        description: 'Coletando informações completas do sistema. Isso pode levar alguns segundos.',
        variant: 'default'
      });

      // Buscar dados completos diretamente das tabelas
      const completeData = await fetchCompleteAnalyticsData(daysFilter, currentSchool.id);

      toast({
        title: 'Gerando relatório...',
        description: 'Criando arquivo Excel com todas as abas.',
        variant: 'default'
      });

      // Gerar relatório Excel
      await generateAnalyticsReport(completeData);

      toast({
        title: 'Relatório gerado!',
        description: 'O arquivo Excel foi baixado com sucesso com todos os dados do sistema.',
        variant: 'default'
      });
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Ocorreu um erro ao gerar o relatório. Verifique o console para mais detalhes.',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={isExporting}
      variant="outline"
      size="default"
      className="gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Gerando relatório completo...
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
