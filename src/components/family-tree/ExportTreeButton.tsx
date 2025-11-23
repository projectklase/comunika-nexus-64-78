import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';

interface ExportTreeButtonProps {
  onExportPNG: () => Promise<void>;
  onExportPDF: () => Promise<void>;
  isExporting: boolean;
}

export function ExportTreeButton({ onExportPNG, onExportPDF, isExporting }: ExportTreeButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className="bg-background/95 backdrop-blur-sm border-border shadow-sm hover:shadow-md transition-all"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar Árvore
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="glass-card">
        <DropdownMenuItem onClick={onExportPNG} disabled={isExporting}>
          <FileImage className="h-4 w-4 mr-2 text-blue-500" />
          <span>Exportar como PNG</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF} disabled={isExporting}>
          <FileText className="h-4 w-4 mr-2 text-red-500" />
          <span>Exportar como PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
