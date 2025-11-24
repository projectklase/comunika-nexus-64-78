import { useState, RefObject, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { toPng, toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { ExportOverlay } from '@/components/family-tree/ExportOverlay';

export function useTreeExport(
  reactFlowWrapper: RefObject<HTMLDivElement>,
  schoolName: string,
  totalFamilies: number = 0,
  totalStudents: number = 0,
  totalGuardians: number = 0
) {
  const [isExporting, setIsExporting] = useState(false);

  const getTimestamp = () => {
    const now = new Date();
    return now.toISOString()
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .replace('T', '_');
  };

  const hideUIElements = () => {
    const sidebar = document.querySelector('[data-family-sidebar]') as HTMLElement;
    const originalDisplay = sidebar?.style.display;
    if (sidebar) sidebar.style.display = 'none';
    return { sidebar, originalDisplay };
  };

  const restoreUIElements = (elements: { sidebar: HTMLElement | null; originalDisplay: string | undefined }) => {
    if (elements.sidebar && elements.originalDisplay) {
      elements.sidebar.style.display = elements.originalDisplay;
    }
  };

  const exportToPNG = async () => {
    if (!reactFlowWrapper.current) {
      toast.error('Árvore não encontrada');
      return;
    }

    setIsExporting(true);

    try {
      const hiddenElements = hideUIElements();

      // 🎯 Estratégia: capturar o ReactFlow real em alta resolução primeiro
      const treeDataUrl = await toPng(reactFlowWrapper.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
      });

      // 🎨 Criar wrapper temporário para overlay profissional
      const exportWrapper = document.createElement('div');
      exportWrapper.style.position = 'absolute';
      exportWrapper.style.left = '-99999px';
      exportWrapper.style.top = '-99999px';
      exportWrapper.style.width = '3508px';
      exportWrapper.style.height = '2480px';
      document.body.appendChild(exportWrapper);

      // Renderizar overlay com a imagem capturada
      const root = createRoot(exportWrapper);
      await new Promise<void>((resolve) => {
        root.render(
          createElement(ExportOverlay, {
            schoolName,
            totalFamilies,
            totalStudents,
            totalGuardians,
            exportDate: new Date(),
            children: createElement('img', {
              src: treeDataUrl,
              style: { width: '100%', height: '100%', objectFit: 'contain' }
            }),
          })
        );
        setTimeout(resolve, 800);
      });

      // Capturar layout completo em 300 DPI
      const finalDataUrl = await toPng(exportWrapper, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        width: 3508,
        height: 2480,
      });

      const link = document.createElement('a');
      link.download = `Arvore_Genealogica_${schoolName.replace(/\s+/g, '_')}_${getTimestamp()}.png`;
      link.href = finalDataUrl;
      link.click();

      // Cleanup
      root.unmount();
      document.body.removeChild(exportWrapper);
      restoreUIElements(hiddenElements);
      toast.success('Árvore exportada como PNG de alta qualidade!');
    } catch (error) {
      console.error('Erro ao exportar PNG:', error);
      toast.error('Erro ao exportar árvore. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!reactFlowWrapper.current) {
      toast.error('Árvore não encontrada');
      return;
    }

    setIsExporting(true);

    try {
      const hiddenElements = hideUIElements();

      const canvas = await toCanvas(reactFlowWrapper.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: (node) => {
          const classList = node.classList;
          if (!classList) return true;
          
          return !classList.contains('react-flow__minimap') &&
                 !classList.contains('react-flow__controls') &&
                 !classList.contains('react-flow__attribution') &&
                 !classList.contains('react-flow__panel');
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width em mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      pdf.setProperties({
        title: `Árvore Genealógica - ${schoolName}`,
        author: 'Sistema de Gestão Escolar',
        creator: 'Sistema de Gestão Escolar'
      });

      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Arvore_Genealogica_${schoolName.replace(/\s+/g, '_')}_${getTimestamp()}.pdf`);

      restoreUIElements(hiddenElements);
      toast.success('Árvore exportada como PDF com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar árvore. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    exportToPNG,
    exportToPDF
  };
}
