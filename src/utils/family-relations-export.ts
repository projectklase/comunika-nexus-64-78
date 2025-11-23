import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FamilyMetrics } from '@/types/family-metrics';
import { RELATIONSHIP_LABELS, type RelationshipType } from '@/types/family-metrics';

interface FamilyGroup {
  family_key: string;
  guardian_name: string;
  guardian_email: string | null;
  guardian_phone: string | null;
  students: Array<{
    id: string;
    name: string;
  }>;
  student_count: number;
}

const COLORS = {
  headerBg: 'FF6B46C1', // Purple
  headerFg: 'FFFFFFFF',
  accentPink: 'FFEC4899',
  accentPurple: 'FFA855F7',
  accentRose: 'FFF43F5E',
  lightBg: 'FFF3E8FF',
  borderColor: 'FFD1D5DB',
};

export async function exportFamilyRelationsToExcel(
  metrics: FamilyMetrics,
  families: FamilyGroup[],
  schoolName: string
) {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Sistema Escolar';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ===== ABA 1: RESUMO EXECUTIVO =====
  const summarySheet = workbook.addWorksheet('Resumo Executivo', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
  });

  // Header
  summarySheet.mergeCells('A1:D1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = `📊 Relatório de Vínculos Familiares - ${schoolName}`;
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.headerBg }
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(1).height = 35;

  summarySheet.mergeCells('A2:D2');
  const dateCell = summarySheet.getCell('A2');
  dateCell.value = format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center' };

  // KPIs
  summarySheet.getCell('A4').value = 'MÉTRICAS PRINCIPAIS';
  summarySheet.getCell('A4').font = { bold: true, size: 12 };
  summarySheet.getCell('A4').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.lightBg }
  };

  const kpis = [
    ['Total de Famílias', metrics.total_families],
    ['Famílias com Múltiplos Alunos', metrics.multi_student_families],
    ['Média de Alunos por Família', metrics.avg_students_per_family.toFixed(2)],
    ['Taxa de Famílias Multi-Alunos', `${((metrics.multi_student_families / metrics.total_families) * 100).toFixed(1)}%`],
  ];

  kpis.forEach((kpi, idx) => {
    const row = 5 + idx;
    summarySheet.getCell(`A${row}`).value = kpi[0];
    summarySheet.getCell(`B${row}`).value = kpi[1];
    summarySheet.getCell(`A${row}`).font = { bold: true };
    summarySheet.getCell(`B${row}`).font = { size: 12, color: { argb: COLORS.accentPurple } };
  });

  // Column widths
  summarySheet.getColumn('A').width = 35;
  summarySheet.getColumn('B').width = 20;

  // ===== ABA 2: FAMÍLIAS MULTI-ALUNOS =====
  const familiesSheet = workbook.addWorksheet('Famílias Multi-Alunos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Header
  const familyHeaders = ['Responsável', 'Email', 'Telefone', 'Qtd Alunos', 'Nomes dos Alunos'];
  familyHeaders.forEach((header, idx) => {
    const cell = familiesSheet.getCell(1, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerFg } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thick', color: { argb: COLORS.accentPink } }
    };
  });

  // Data
  families
    .sort((a, b) => b.student_count - a.student_count)
    .forEach((family, idx) => {
      const row = idx + 2;
      familiesSheet.getCell(row, 1).value = family.guardian_name;
      familiesSheet.getCell(row, 2).value = family.guardian_email || '-';
      familiesSheet.getCell(row, 3).value = family.guardian_phone || '-';
      familiesSheet.getCell(row, 4).value = family.student_count;
      familiesSheet.getCell(row, 5).value = family.students.map(s => s.name).join(', ');

      // Highlight para famílias com 3+ alunos
      if (family.student_count >= 3) {
        for (let col = 1; col <= 5; col++) {
          familiesSheet.getCell(row, col).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDF4' }
          };
        }
      }

      // Formatting
      familiesSheet.getCell(row, 4).alignment = { horizontal: 'center' };
      familiesSheet.getCell(row, 4).font = { bold: true, color: { argb: COLORS.accentPink } };
    });

  // Column widths
  familiesSheet.getColumn(1).width = 30;
  familiesSheet.getColumn(2).width = 35;
  familiesSheet.getColumn(3).width = 20;
  familiesSheet.getColumn(4).width = 15;
  familiesSheet.getColumn(5).width = 50;

  // ===== ABA 3: DISTRIBUIÇÃO DE PARENTESCOS =====
  const relationsSheet = workbook.addWorksheet('Distribuição de Parentescos', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Header
  const relationHeaders = ['Tipo de Parentesco', 'Quantidade', 'Percentual'];
  relationHeaders.forEach((header, idx) => {
    const cell = relationsSheet.getCell(1, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerFg } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thick', color: { argb: COLORS.accentPurple } }
    };
  });

  // Data
  const totalRelationships = metrics.relationship_distribution.reduce((sum, r) => sum + r.count, 0);
  
  metrics.relationship_distribution
    .sort((a, b) => b.count - a.count)
    .forEach((rel, idx) => {
      const row = idx + 2;
      const label = RELATIONSHIP_LABELS[rel.relationship_type as RelationshipType] || rel.relationship_type;
      const percentage = ((rel.count / totalRelationships) * 100).toFixed(1);

      relationsSheet.getCell(row, 1).value = label;
      relationsSheet.getCell(row, 2).value = rel.count;
      relationsSheet.getCell(row, 3).value = `${percentage}%`;

      // Formatting
      relationsSheet.getCell(row, 2).alignment = { horizontal: 'center' };
      relationsSheet.getCell(row, 2).font = { bold: true, color: { argb: COLORS.accentPurple } };
      relationsSheet.getCell(row, 3).alignment = { horizontal: 'center' };
    });

  // Column widths
  relationsSheet.getColumn(1).width = 30;
  relationsSheet.getColumn(2).width = 15;
  relationsSheet.getColumn(3).width = 15;

  // ===== ABA 4: TOP RESPONSÁVEIS =====
  const topGuardiansSheet = workbook.addWorksheet('Top Responsáveis', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
  });

  // Header
  const topHeaders = ['Posição', 'Responsável', 'Email', 'Telefone', 'Qtd Alunos', 'Alunos'];
  topHeaders.forEach((header, idx) => {
    const cell = topGuardiansSheet.getCell(1, idx + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerFg } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'thick', color: { argb: COLORS.accentRose } }
    };
  });

  // Data
  metrics.top_guardians.forEach((guardian, idx) => {
    const row = idx + 2;
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`;

    topGuardiansSheet.getCell(row, 1).value = medal;
    topGuardiansSheet.getCell(row, 2).value = guardian.name;
    topGuardiansSheet.getCell(row, 3).value = guardian.email || '-';
    topGuardiansSheet.getCell(row, 4).value = guardian.phone || '-';
    topGuardiansSheet.getCell(row, 5).value = guardian.student_count;
    topGuardiansSheet.getCell(row, 6).value = guardian.students.join(', ');

    // Highlight top 3
    if (idx < 3) {
      for (let col = 1; col <= 6; col++) {
        topGuardiansSheet.getCell(row, col).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: idx === 0 ? 'FFFEF3C7' : idx === 1 ? 'FFE5E5E5' : 'FFFDE68A' }
        };
      }
    }

    // Formatting
    topGuardiansSheet.getCell(row, 1).alignment = { horizontal: 'center' };
    topGuardiansSheet.getCell(row, 1).font = { size: 14 };
    topGuardiansSheet.getCell(row, 5).alignment = { horizontal: 'center' };
    topGuardiansSheet.getCell(row, 5).font = { bold: true, color: { argb: COLORS.accentRose } };
  });

  // Column widths
  topGuardiansSheet.getColumn(1).width = 12;
  topGuardiansSheet.getColumn(2).width = 30;
  topGuardiansSheet.getColumn(3).width = 35;
  topGuardiansSheet.getColumn(4).width = 20;
  topGuardiansSheet.getColumn(5).width = 15;
  topGuardiansSheet.getColumn(6).width = 50;

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const fileName = `Relatorio_Vinculos_Familiares_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
  saveAs(blob, fileName);
}
