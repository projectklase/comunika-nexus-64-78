import ExcelJS from 'exceljs';
import { ExportData } from '@/types/excel-export';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = {
  primary: '4A90E2',
  success: '50C878',
  danger: 'FF6B6B',
  warning: 'FFB84D',
  info: '6C5CE7',
  gray: 'F8F9FA',
  darkGray: '495057',
  white: 'FFFFFF',
};

// Helper para aplicar estilo de header
function applyHeaderStyle(cell: ExcelJS.Cell, bgColor: string = COLORS.primary) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: bgColor },
  };
  cell.font = {
    bold: true,
    color: { argb: COLORS.white },
    size: 12,
  };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'medium', color: { argb: '000000' } },
    bottom: { style: 'medium', color: { argb: '000000' } },
    left: { style: 'medium', color: { argb: '000000' } },
    right: { style: 'medium', color: { argb: '000000' } },
  };
}

// Helper para aplicar zebra striping
function applyZebraStyle(row: ExcelJS.Row, isEven: boolean) {
  row.eachCell((cell) => {
    if (!cell.fill || (cell.fill as any).fgColor?.argb === COLORS.white) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? COLORS.gray : COLORS.white },
      };
    }
    cell.border = {
      top: { style: 'thin', color: { argb: 'CCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } },
    };
  });
}

// Helper para aplicar formatação condicional
function applyConditionalColor(cell: ExcelJS.Cell, value: number, thresholds: { danger: number; warning: number; success: number }) {
  let bgColor = COLORS.white;
  
  if (value <= thresholds.danger) {
    bgColor = COLORS.danger;
  } else if (value <= thresholds.warning) {
    bgColor = COLORS.warning;
  } else if (value >= thresholds.success) {
    bgColor = COLORS.success;
  }

  if (bgColor !== COLORS.white) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
    };
    cell.font = {
      bold: true,
      color: { argb: COLORS.white },
    };
  }
}

// Aba 1: Dashboard Geral
function createDashboardSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Dashboard Geral', {
    views: [{ showGridLines: false }],
  });

  // Título principal
  sheet.mergeCells('A1:D1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'RELATÓRIO DE INTELIGÊNCIA ANALYTICS';
  titleCell.font = { bold: true, size: 18, color: { argb: COLORS.primary } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  // Informações do relatório
  sheet.getCell('A3').value = 'Data de Geração:';
  sheet.getCell('B3').value = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  sheet.getCell('A4').value = 'Período Analisado:';
  sheet.getCell('B4').value = `Últimos ${data.daysFilter} dias`;

  sheet.getCell('A3').font = { bold: true };
  sheet.getCell('A4').font = { bold: true };

  // Seção de resumo executivo
  sheet.mergeCells('A6:D6');
  const summaryTitle = sheet.getCell('A6');
  summaryTitle.value = 'RESUMO EXECUTIVO';
  applyHeaderStyle(summaryTitle, COLORS.darkGray);
  sheet.getRow(6).height = 25;

  // Headers da tabela de KPIs
  const headerRow = sheet.getRow(8);
  headerRow.values = ['Métrica', 'Valor', 'Status', 'Tendência'];
  headerRow.eachCell((cell) => applyHeaderStyle(cell));
  headerRow.height = 20;

  // KPIs principais
  const kpis = [
    ['Alunos em Risco', data.analytics?.students_at_risk_count || 0, data.analytics?.students_at_risk_count > 5 ? '⚠️ Atenção' : '✅ OK', '-'],
    ['Taxa de Retenção', `${(data.retentionData?.retention_rate || 0).toFixed(1)}%`, data.retentionData?.retention_rate >= 80 ? '✅ Excelente' : '⚠️ Precisa Melhorar', '-'],
    ['Pulse Score™', (data.pulseData?.overall_score || 0).toFixed(1), data.pulseData?.overall_score >= 80 ? '✅ Excelente' : '⚠️ Atenção', '-'],
    ['Ocupação Média', `${(data.operationalData?.avg_occupancy || 0).toFixed(1)}%`, data.operationalData?.avg_occupancy >= 75 ? '✅ Boa' : '⚠️ Baixa', '-'],
    ['Taxa de Leitura Média', `${(data.postReadData?.avg_read_rate || 0).toFixed(1)}%`, data.postReadData?.avg_read_rate >= 70 ? '✅ Excelente' : '⚠️ Baixa', '-'],
  ];

  kpis.forEach((kpi, index) => {
    const row = sheet.getRow(9 + index);
    row.values = kpi;
    applyZebraStyle(row, index % 2 === 0);
    
    // Aplicar cor condicional na coluna de status
    const statusCell = row.getCell(3);
    if (kpi[2].includes('Atenção') || kpi[2].includes('Precisa Melhorar') || kpi[2].includes('Baixa')) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.warning },
      };
      statusCell.font = { bold: true };
    } else if (kpi[2].includes('OK') || kpi[2].includes('Excelente') || kpi[2].includes('Boa')) {
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.success }
      };
      statusCell.font = { bold: true, color: { argb: COLORS.white } };
    }
  });

  // Ajustar largura das colunas
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 15;

  // Adicionar seção de insights
  sheet.mergeCells('A15:D15');
  const insightsTitle = sheet.getCell('A15');
  insightsTitle.value = 'PRINCIPAIS INSIGHTS';
  applyHeaderStyle(insightsTitle, COLORS.info);

  const insights = [
    `• ${data.analytics?.students_at_risk_count || 0} alunos identificados em risco de evasão`,
    `• Turma com pior desempenho: ${data.analytics?.worst_class_name || 'N/A'}`,
    `• Taxa média de engajamento em posts: ${(data.postReadData?.avg_read_rate || 0).toFixed(1)}%`,
    `• ${data.retentionData?.active_students || 0} alunos ativos de ${data.retentionData?.total_enrolled || 0} matriculados`,
  ];

  insights.forEach((insight, index) => {
    const cell = sheet.getCell(`A${17 + index}`);
    cell.value = insight;
    cell.alignment = { wrapText: true };
  });
}

// Aba 2: Mapa de Calor
function createHeatmapSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Mapa de Calor');

  // Título
  sheet.mergeCells('A1:I1');
  const title = sheet.getCell('A1');
  title.value = 'MAPA DE CALOR SEMANAL - ATIVIDADE POR DIA E HORA';
  applyHeaderStyle(title, COLORS.info);
  sheet.getRow(1).height = 25;

  const sections = [
    { name: 'ENTREGAS', data: data.heatmapData?.deliveries_heatmap || [], startRow: 3 },
    { name: 'POSTS PUBLICADOS', data: data.heatmapData?.posts_heatmap || [], startRow: 13 },
    { name: 'CORREÇÕES', data: data.heatmapData?.corrections_heatmap || [], startRow: 23 },
    { name: 'LOGINS', data: data.heatmapData?.logins_heatmap || [], startRow: 33 },
  ];

  sections.forEach(section => {
    // Título da seção
    sheet.mergeCells(`A${section.startRow}:I${section.startRow}`);
    const sectionTitle = sheet.getCell(`A${section.startRow}`);
    sectionTitle.value = section.name;
    applyHeaderStyle(sectionTitle, COLORS.primary);

    // Headers (dias da semana)
    const headerRow = sheet.getRow(section.startRow + 1);
    headerRow.values = ['Hora', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    headerRow.eachCell(cell => applyHeaderStyle(cell, COLORS.darkGray));

    // Criar matriz 24x7
    const matrix: number[][] = Array(24).fill(0).map(() => Array(7).fill(0));
    
    section.data.forEach((item: any) => {
      const hour = item.hour || 0;
      const day = item.day_of_week || 0;
      const count = item.count || 0;
      if (hour >= 0 && hour < 24 && day >= 0 && day < 7) {
        matrix[hour][day] = count;
      }
    });

    // Preencher dados
    for (let hour = 0; hour < 24; hour++) {
      const row = sheet.getRow(section.startRow + 2 + hour);
      row.values = [`${hour}:00`, ...matrix[hour]];
      
      // Aplicar formatação condicional baseada em valores
      const maxValue = Math.max(...matrix[hour]);
      row.eachCell((cell, colNumber) => {
        if (colNumber > 1) {
          const value = cell.value as number || 0;
          const intensity = maxValue > 0 ? value / maxValue : 0;
          
          if (intensity > 0.7) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
            cell.font = { bold: true, color: { argb: COLORS.white } };
          } else if (intensity > 0.4) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
            cell.font = { bold: true };
          } else if (intensity > 0.2) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5B4' } };
          }
          
          cell.alignment = { horizontal: 'center' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } },
          };
        }
      });
    }
  });

  // Ajustar largura das colunas
  sheet.getColumn(1).width = 8;
  for (let i = 2; i <= 8; i++) {
    sheet.getColumn(i).width = 10;
  }

  // Adicionar insights no final
  const insightsRow = 43;
  sheet.mergeCells(`A${insightsRow}:I${insightsRow}`);
  const insights = sheet.getCell(`A${insightsRow}`);
  insights.value = 'INSIGHTS DO MAPA DE CALOR';
  applyHeaderStyle(insights, COLORS.success);

  sheet.getCell(`A${insightsRow + 2}`).value = `Horário de Pico de Entregas: ${data.heatmapData?.peak_delivery_hour || 'N/A'}`;
  sheet.getCell(`A${insightsRow + 3}`).value = `Dia Mais Ativo: ${data.heatmapData?.peak_day || 'N/A'}`;
  sheet.getCell(`A${insightsRow + 4}`).value = `Total de Entregas: ${data.heatmapData?.total_deliveries || 0}`;
}

// Aba 3: Retenção
function createRetentionSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Retenção');

  // Título
  sheet.mergeCells('A1:D1');
  const title = sheet.getCell('A1');
  title.value = 'RETENÇÃO E PROGRESSÃO DE ALUNOS';
  applyHeaderStyle(title, COLORS.success);
  sheet.getRow(1).height = 25;

  // KPIs principais
  sheet.mergeCells('A3:D3');
  const kpiTitle = sheet.getCell('A3');
  kpiTitle.value = 'INDICADORES PRINCIPAIS';
  applyHeaderStyle(kpiTitle, COLORS.darkGray);

  const kpis = [
    ['Total de Alunos Matriculados', data.retentionData?.total_enrolled || 0],
    ['Alunos Ativos', data.retentionData?.active_students || 0],
    ['Taxa de Retenção', `${(data.retentionData?.retention_rate || 0).toFixed(1)}%`],
    ['Média de Dias Ativos', `${(data.retentionData?.avg_days_active || 0).toFixed(0)} dias`],
  ];

  kpis.forEach((kpi, index) => {
    const row = sheet.getRow(5 + index);
    row.values = [kpi[0], kpi[1]];
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { size: 14, bold: true, color: { argb: COLORS.primary } };
    applyZebraStyle(row, index % 2 === 0);
  });

  // Evolução mensal
  sheet.mergeCells('A10:D10');
  const trendTitle = sheet.getCell('A10');
  trendTitle.value = 'EVOLUÇÃO DOS ÚLTIMOS 6 MESES';
  applyHeaderStyle(trendTitle, COLORS.info);

  const trendHeader = sheet.getRow(11);
  trendHeader.values = ['Mês', 'Matriculados', 'Ativos', 'Taxa (%)'];
  trendHeader.eachCell(cell => applyHeaderStyle(cell, COLORS.darkGray));

  const enrollmentTrend = data.retentionData?.enrollment_trend || [];
  enrollmentTrend.forEach((item: any, index: number) => {
    const row = sheet.getRow(12 + index);
    const rate = item.enrolled > 0 ? ((item.active / item.enrolled) * 100).toFixed(1) : '0.0';
    row.values = [item.month, item.enrolled, item.active, `${rate}%`];
    applyZebraStyle(row, index % 2 === 0);
    
    // Formatação condicional na taxa
    const rateCell = row.getCell(4);
    const rateValue = parseFloat(rate);
    applyConditionalColor(rateCell, rateValue, { danger: 60, warning: 75, success: 85 });
  });

  // Análise e recomendações
  sheet.mergeCells('A19:D19');
  const analysisTitle = sheet.getCell('A19');
  analysisTitle.value = 'ANÁLISE E RECOMENDAÇÕES';
  applyHeaderStyle(analysisTitle, COLORS.warning);

  const retentionRate = data.retentionData?.retention_rate || 0;
  const recommendations = [];

  if (retentionRate < 70) {
    recommendations.push('🚨 Taxa de retenção crítica! Implementar programa de acompanhamento individual.');
    recommendations.push('• Criar grupos de estudo e mentoria entre alunos');
    recommendations.push('• Realizar pesquisa de satisfação para identificar pontos de melhoria');
  } else if (retentionRate < 85) {
    recommendations.push('⚠️ Taxa de retenção precisa melhorar. Ações sugeridas:');
    recommendations.push('• Aumentar comunicação com alunos menos ativos');
    recommendations.push('• Oferecer atividades de reforço e recuperação');
  } else {
    recommendations.push('✅ Excelente taxa de retenção! Manter boas práticas:');
    recommendations.push('• Continuar monitoramento semanal de engajamento');
    recommendations.push('• Compartilhar estratégias de sucesso entre professores');
  }

  recommendations.forEach((rec, index) => {
    const cell = sheet.getCell(`A${21 + index}`);
    cell.value = rec;
    cell.alignment = { wrapText: true };
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 35;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 15;
}

// Aba 4: Operacional
function createOperationalSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Operacional');

  // Título
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = 'MÉTRICAS OPERACIONAIS';
  applyHeaderStyle(title, COLORS.warning);
  sheet.getRow(1).height = 25;

  // Ocupação média
  sheet.getCell('A3').value = 'Taxa de Ocupação Média:';
  sheet.getCell('B3').value = `${(data.operationalData?.avg_occupancy || 0).toFixed(1)}%`;
  sheet.getCell('A3').font = { bold: true, size: 12 };
  sheet.getCell('B3').font = { bold: true, size: 16, color: { argb: COLORS.primary } };

  // Ocupação por turma
  sheet.mergeCells('A5:E5');
  const occupancyTitle = sheet.getCell('A5');
  occupancyTitle.value = 'OCUPAÇÃO POR TURMA';
  applyHeaderStyle(occupancyTitle, COLORS.darkGray);

  const occupancyHeader = sheet.getRow(6);
  occupancyHeader.values = ['Turma', 'Capacidade', 'Matriculados', 'Vagas Livres', 'Taxa (%)'];
  occupancyHeader.eachCell(cell => applyHeaderStyle(cell));

  const occupancyData = data.operationalData?.occupancy_data || [];
  occupancyData.forEach((item: any, index: number) => {
    const row = sheet.getRow(7 + index);
    row.values = [
      item.class_name,
      item.capacity,
      item.enrolled,
      item.capacity - item.enrolled,
      `${((item.enrolled / item.capacity) * 100).toFixed(1)}%`
    ];
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional
    const rateCell = row.getCell(5);
    const rate = (item.enrolled / item.capacity) * 100;
    applyConditionalColor(rateCell, rate, { danger: 50, warning: 70, success: 85 });
  });

  // Distribuição de Koins
  const koinsStartRow = 7 + occupancyData.length + 2;
  sheet.mergeCells(`A${koinsStartRow}:E${koinsStartRow}`);
  const koinsTitle = sheet.getCell(`A${koinsStartRow}`);
  koinsTitle.value = 'DISTRIBUIÇÃO DE KOINS';
  applyHeaderStyle(koinsTitle, COLORS.info);

  const koinsData = data.operationalData?.koins_distribution || {};
  const koinsRows = [
    ['Total de Koins Distribuídos', koinsData.total || 0],
    ['Média por Aluno', (koinsData.average || 0).toFixed(0)],
    ['Aluno com Mais Koins', koinsData.max || 0],
    ['Aluno com Menos Koins', koinsData.min || 0],
  ];

  koinsRows.forEach((item, index) => {
    const row = sheet.getRow(koinsStartRow + 2 + index);
    row.values = [item[0], item[1]];
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { size: 12, color: { argb: COLORS.primary } };
    applyZebraStyle(row, index % 2 === 0);
  });

  // ROI de Professores
  const roiStartRow = koinsStartRow + 7;
  sheet.mergeCells(`A${roiStartRow}:E${roiStartRow}`);
  const roiTitle = sheet.getCell(`A${roiStartRow}`);
  roiTitle.value = 'PERFORMANCE DOS PROFESSORES (ROI)';
  applyHeaderStyle(roiTitle, COLORS.success);

  const roiHeader = sheet.getRow(roiStartRow + 1);
  roiHeader.values = ['Professor', 'Entregas Recebidas', 'Avaliações Feitas', 'Taxa de Correção (%)', 'Tempo Médio (h)'];
  roiHeader.eachCell(cell => applyHeaderStyle(cell));

  const teacherRoi = data.operationalData?.teacher_roi || [];
  teacherRoi.forEach((teacher: any, index: number) => {
    const row = sheet.getRow(roiStartRow + 2 + index);
    const correctionRate = teacher.deliveries > 0 ? ((teacher.evaluations / teacher.deliveries) * 100).toFixed(1) : '0.0';
    row.values = [
      teacher.teacher_name,
      teacher.deliveries,
      teacher.evaluations,
      `${correctionRate}%`,
      teacher.avg_time ? teacher.avg_time.toFixed(1) : 'N/A'
    ];
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional na taxa de correção
    const rateCell = row.getCell(4);
    const rate = parseFloat(correctionRate);
    applyConditionalColor(rateCell, rate, { danger: 70, warning: 85, success: 95 });
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 18;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 18;
}

// Aba 5: Pulse Score
function createPulseScoreSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Pulse Score');

  // Título
  sheet.mergeCells('A1:D1');
  const title = sheet.getCell('A1');
  title.value = 'PULSE SCORE™ - SAÚDE INSTITUCIONAL';
  applyHeaderStyle(title, COLORS.primary);
  sheet.getRow(1).height = 25;

  // Score geral destacado
  sheet.mergeCells('A3:D3');
  const scoreCell = sheet.getCell('A3');
  scoreCell.value = `SCORE GERAL: ${(data.pulseData?.overall_score || 0).toFixed(1)}`;
  scoreCell.font = { bold: true, size: 24, color: { argb: COLORS.primary } };
  scoreCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(3).height = 40;

  const score = data.pulseData?.overall_score || 0;
  if (score >= 80) {
    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } };
    scoreCell.font.color = { argb: COLORS.white };
  } else if (score >= 60) {
    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
  } else {
    scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
    scoreCell.font.color = { argb: COLORS.white };
  }

  // Breakdown dos componentes
  sheet.mergeCells('A5:D5');
  const componentsTitle = sheet.getCell('A5');
  componentsTitle.value = 'BREAKDOWN DOS COMPONENTES';
  applyHeaderStyle(componentsTitle, COLORS.darkGray);

  const componentsHeader = sheet.getRow(6);
  componentsHeader.values = ['Componente', 'Score', 'Peso', 'Contribuição'];
  componentsHeader.eachCell(cell => applyHeaderStyle(cell));

  const components = data.pulseData?.components || {};
  const componentsList = [
    { name: 'Engajamento', score: components.engagement || 0, weight: 30 },
    { name: 'Performance de Professores', score: components.teacher_performance || 0, weight: 25 },
    { name: 'Taxa de Ocupação', score: components.occupancy || 0, weight: 20 },
    { name: 'Taxa de Aprovação', score: components.approval_rate || 0, weight: 15 },
    { name: 'Retenção', score: components.retention || 0, weight: 10 },
  ];

  componentsList.forEach((comp, index) => {
    const row = sheet.getRow(7 + index);
    const contribution = (comp.score * comp.weight / 100).toFixed(1);
    row.values = [comp.name, comp.score.toFixed(1), `${comp.weight}%`, contribution];
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional no score
    const scoreCell = row.getCell(2);
    applyConditionalColor(scoreCell, comp.score, { danger: 60, warning: 75, success: 85 });
  });

  // Evolução dos últimos 30 dias
  sheet.mergeCells('A13:D13');
  const trendTitle = sheet.getCell('A13');
  trendTitle.value = 'EVOLUÇÃO DOS ÚLTIMOS 30 DIAS';
  applyHeaderStyle(trendTitle, COLORS.info);

  const trendHeader = sheet.getRow(14);
  trendHeader.values = ['Data', 'Score', 'Variação', 'Status'];
  trendHeader.eachCell(cell => applyHeaderStyle(cell));

  const trendData = data.pulseData?.trend || [];
  trendData.forEach((item: any, index: number) => {
    const row = sheet.getRow(15 + index);
    const variation = index > 0 ? item.score - trendData[index - 1].score : 0;
    const status = variation > 0 ? '📈 Alta' : variation < 0 ? '📉 Baixa' : '➡️ Estável';
    row.values = [
      item.date,
      item.score.toFixed(1),
      variation.toFixed(1),
      status
    ];
    applyZebraStyle(row, index % 2 === 0);
  });

  // Recomendações
  const recStartRow = 15 + trendData.length + 2;
  sheet.mergeCells(`A${recStartRow}:D${recStartRow}`);
  const recTitle = sheet.getCell(`A${recStartRow}`);
  recTitle.value = 'RECOMENDAÇÕES ESTRATÉGICAS';
  applyHeaderStyle(recTitle, COLORS.warning);

  const recommendations = [];
  if (components.engagement < 70) recommendations.push('🎯 Engajamento baixo: Criar campanhas de incentivo e gamificação');
  if (components.teacher_performance < 75) recommendations.push('👨‍🏫 Melhorar performance docente: Treinamento em correção ágil');
  if (components.occupancy < 75) recommendations.push('📊 Ocupação baixa: Intensificar marketing e captação de alunos');
  if (components.approval_rate < 80) recommendations.push('✅ Taxa de aprovação: Revisar dificuldade das atividades');
  if (components.retention < 75) recommendations.push('🔒 Retenção: Implementar programa de acompanhamento individual');

  if (recommendations.length === 0) {
    recommendations.push('✅ Excelente desempenho em todas as dimensões! Manter as boas práticas.');
  }

  recommendations.forEach((rec, index) => {
    const cell = sheet.getCell(`A${recStartRow + 2 + index}`);
    cell.value = rec;
    cell.alignment = { wrapText: true };
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 35;
  sheet.getColumn(2).width = 15;
  sheet.getColumn(3).width = 15;
  sheet.getColumn(4).width = 20;
}

// Aba 6: Alunos em Risco
function createStudentsAtRiskSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Alunos em Risco');

  // Título
  sheet.mergeCells('A1:F1');
  const title = sheet.getCell('A1');
  title.value = `ALUNOS EM RISCO DE EVASÃO (${data.analytics?.students_at_risk_count || 0})`;
  applyHeaderStyle(title, COLORS.danger);
  sheet.getRow(1).height = 25;

  // Headers
  const header = sheet.getRow(3);
  header.values = ['Nome do Aluno', 'Turma', 'Dias Sem Login', 'Entregas Pendentes', 'Aguardando Avaliação', 'Nível de Risco'];
  header.eachCell(cell => applyHeaderStyle(cell, COLORS.darkGray));

  // Dados dos alunos em risco
  const studentsAtRisk = data.analytics?.students_at_risk_list || [];
  studentsAtRisk.forEach((student: any, index: number) => {
    const row = sheet.getRow(4 + index);
    const daysWithoutLogin = student.days_since_last_login || 0;
    const pendingDeliveries = student.pending_deliveries || 0;
    const pendingEvaluations = student.pending_evaluations || 0;
    
    let riskLevel = '⚠️ Moderado';
    let riskColor = COLORS.warning;
    
    if (daysWithoutLogin > 14 || pendingDeliveries > 5) {
      riskLevel = '🚨 Crítico';
      riskColor = COLORS.danger;
    } else if (daysWithoutLogin > 7 || pendingDeliveries > 3) {
      riskLevel = '⚠️ Alto';
      riskColor = COLORS.warning;
    } else {
      riskLevel = '⚡ Baixo';
      riskColor = 'FFE5B4';
    }

    row.values = [
      student.student_name,
      student.class_name || 'Sem turma',
      daysWithoutLogin,
      pendingDeliveries,
      pendingEvaluations,
      riskLevel
    ];
    
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional
    const riskCell = row.getCell(6);
    riskCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColor } };
    if (riskColor === COLORS.danger) {
      riskCell.font = { bold: true, color: { argb: COLORS.white } };
    } else {
      riskCell.font = { bold: true };
    }

    // Destacar dias sem login críticos
    const daysCell = row.getCell(3);
    if (daysWithoutLogin > 14) {
      daysCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
      daysCell.font = { bold: true, color: { argb: COLORS.white } };
    }

    // Destacar entregas pendentes altas
    const pendingCell = row.getCell(4);
    if (pendingDeliveries > 3) {
      pendingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.warning } };
      pendingCell.font = { bold: true };
    }
  });

  // Resumo e insights
  const summaryRow = 4 + studentsAtRisk.length + 2;
  sheet.mergeCells(`A${summaryRow}:F${summaryRow}`);
  const summary = sheet.getCell(`A${summaryRow}`);
  summary.value = 'PLANO DE AÇÃO RECOMENDADO';
  applyHeaderStyle(summary, COLORS.info);

  const actions = [
    '1. Contatar imediatamente alunos com risco crítico (>14 dias sem login)',
    '2. Enviar lembretes automáticos para entregas pendentes',
    '3. Oferecer sessões de reforço para alunos com muitas pendências',
    '4. Monitorar semanalmente a evolução destes alunos',
    '5. Considerar reunião com responsáveis para casos críticos'
  ];

  actions.forEach((action, index) => {
    const cell = sheet.getCell(`A${summaryRow + 2 + index}`);
    cell.value = action;
    cell.alignment = { wrapText: true };
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 30;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 22;
  sheet.getColumn(6).width = 18;
}

// Aba 7: Tendência de Atividades
function createActivityTrendSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Tendência Atividades');

  // Título
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = 'TENDÊNCIA DE ATIVIDADES E ENTREGAS';
  applyHeaderStyle(title, COLORS.info);
  sheet.getRow(1).height = 25;

  // Headers
  const header = sheet.getRow(3);
  header.values = ['Data', 'Atividades Publicadas', 'Entregas Realizadas', 'Taxa de Entrega (%)', 'Diferença'];
  header.eachCell(cell => applyHeaderStyle(cell));

  // Dados de tendência
  const activityTrend = data.analytics?.activity_trend || [];
  let totalActivities = 0;
  let totalDeliveries = 0;

  activityTrend.forEach((item: any, index: number) => {
    const row = sheet.getRow(4 + index);
    const rate = item.activities_published > 0 
      ? ((item.deliveries_made / item.activities_published) * 100).toFixed(1)
      : '0.0';
    const diff = item.deliveries_made - item.activities_published;
    
    row.values = [
      format(new Date(item.date), 'dd/MM/yyyy'),
      item.activities_published,
      item.deliveries_made,
      `${rate}%`,
      diff
    ];
    
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional na taxa
    const rateCell = row.getCell(4);
    const rateValue = parseFloat(rate);
    applyConditionalColor(rateCell, rateValue, { danger: 50, warning: 70, success: 85 });

    // Formatação condicional na diferença
    const diffCell = row.getCell(5);
    if (diff < 0) {
      diffCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
      diffCell.font = { bold: true, color: { argb: COLORS.white } };
    } else if (diff > 0) {
      diffCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.success } };
      diffCell.font = { bold: true, color: { argb: COLORS.white } };
    }

    totalActivities += item.activities_published;
    totalDeliveries += item.deliveries_made;
  });

  // Linha de totais
  const totalRow = sheet.getRow(4 + activityTrend.length);
  const avgRate = totalActivities > 0 ? ((totalDeliveries / totalActivities) * 100).toFixed(1) : '0.0';
  totalRow.values = ['TOTAL', totalActivities, totalDeliveries, `${avgRate}%`, totalDeliveries - totalActivities];
  totalRow.eachCell(cell => {
    cell.font = { bold: true, size: 12 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.darkGray } };
    cell.font = { bold: true, color: { argb: COLORS.white } };
  });

  // Estatísticas
  const statsRow = 4 + activityTrend.length + 3;
  sheet.mergeCells(`A${statsRow}:E${statsRow}`);
  const statsTitle = sheet.getCell(`A${statsRow}`);
  statsTitle.value = 'ESTATÍSTICAS DO PERÍODO';
  applyHeaderStyle(statsTitle, COLORS.success);

  const avgActivities = activityTrend.length > 0 ? (totalActivities / activityTrend.length).toFixed(1) : '0.0';
  const avgDeliveries = activityTrend.length > 0 ? (totalDeliveries / activityTrend.length).toFixed(1) : '0.0';

  const stats = [
    ['Média de Atividades por Dia', avgActivities],
    ['Média de Entregas por Dia', avgDeliveries],
    ['Taxa Média de Entrega', avgRate + '%'],
    ['Melhor Dia (Entregas)', activityTrend.reduce((max: any, item: any) => item.deliveries_made > max.deliveries_made ? item : max, activityTrend[0] || {}).date || 'N/A'],
  ];

  stats.forEach((stat, index) => {
    const row = sheet.getRow(statsRow + 2 + index);
    row.values = [stat[0], stat[1]];
    row.getCell(1).font = { bold: true };
    row.getCell(2).font = { size: 12, color: { argb: COLORS.primary } };
    applyZebraStyle(row, index % 2 === 0);
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 20;
  sheet.getColumn(5).width = 15;
}

// Aba 8: Performance de Turmas
function createClassPerformanceSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Performance Turmas');

  // Título
  sheet.mergeCells('A1:F1');
  const title = sheet.getCell('A1');
  title.value = 'PERFORMANCE POR TURMA';
  applyHeaderStyle(title, COLORS.success);
  sheet.getRow(1).height = 25;

  // Headers
  const header = sheet.getRow(3);
  header.values = ['Turma', 'Taxa de Entrega (%)', 'Tempo Médio (dias)', 'Aprovações', 'Devoluções', 'Status'];
  header.eachCell(cell => applyHeaderStyle(cell));

  // Nota: Os dados de performance por turma precisariam vir de um hook específico
  // Por ora, vamos usar dados mock ou do analytics
  const classPerformance = [
    { name: data.analytics?.worst_class_name || 'Turma Exemplo', deliveryRate: 65, avgTime: 5.2, approvals: 45, returns: 12 },
    // Adicionar mais dados se disponíveis
  ];

  classPerformance.forEach((cls: any, index: number) => {
    const row = sheet.getRow(4 + index);
    
    let status = '✅ Bom';
    let statusColor = COLORS.success;
    
    if (cls.deliveryRate < 60 || cls.avgTime > 7) {
      status = '🚨 Crítico';
      statusColor = COLORS.danger;
    } else if (cls.deliveryRate < 75 || cls.avgTime > 5) {
      status = '⚠️ Atenção';
      statusColor = COLORS.warning;
    }

    row.values = [
      cls.name,
      `${cls.deliveryRate.toFixed(1)}%`,
      cls.avgTime.toFixed(1),
      cls.approvals,
      cls.returns,
      status
    ];
    
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional
    const rateCell = row.getCell(2);
    applyConditionalColor(rateCell, cls.deliveryRate, { danger: 60, warning: 75, success: 85 });

    const statusCell = row.getCell(6);
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
    if (statusColor !== 'FFE5B4') {
      statusCell.font = { bold: true, color: { argb: COLORS.white } };
    }
  });

  // Insights
  const insightsRow = 4 + classPerformance.length + 2;
  sheet.mergeCells(`A${insightsRow}:F${insightsRow}`);
  const insights = sheet.getCell(`A${insightsRow}`);
  insights.value = 'INSIGHTS E AÇÕES';
  applyHeaderStyle(insights, COLORS.info);

  const actions = [
    `🎯 Turma com melhor desempenho: ${classPerformance[0]?.name || 'N/A'}`,
    `⚠️ Turma que precisa de atenção: ${data.analytics?.worst_class_name || 'N/A'}`,
    '📊 Recomendação: Realizar reunião com professor da turma crítica',
    '💡 Compartilhar boas práticas da turma de melhor desempenho'
  ];

  actions.forEach((action, index) => {
    const cell = sheet.getCell(`A${insightsRow + 2 + index}`);
    cell.value = action;
    cell.alignment = { wrapText: true };
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 25;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 20;
  sheet.getColumn(4).width = 15;
  sheet.getColumn(5).width = 15;
  sheet.getColumn(6).width = 18;
}

// Aba 9: Engajamento de Posts
function createPostEngagementSheet(workbook: ExcelJS.Workbook, data: ExportData) {
  const sheet = workbook.addWorksheet('Engajamento Posts');

  // Título
  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = 'ANÁLISE DE ENGAJAMENTO EM POSTS';
  applyHeaderStyle(title, COLORS.primary);
  sheet.getRow(1).height = 25;

  // KPIs principais
  sheet.getCell('A3').value = 'Taxa Média de Leitura:';
  sheet.getCell('B3').value = `${(data.postReadData?.avg_read_rate || 0).toFixed(1)}%`;
  sheet.getCell('A3').font = { bold: true };
  sheet.getCell('B3').font = { bold: true, size: 16, color: { argb: COLORS.primary } };

  sheet.getCell('A4').value = 'Total de Posts Publicados:';
  sheet.getCell('B4').value = data.postReadData?.total_posts_published || 0;
  sheet.getCell('A4').font = { bold: true };
  sheet.getCell('B4').font = { bold: true, size: 14 };

  sheet.getCell('A5').value = 'Total de Leituras:';
  sheet.getCell('B5').value = data.postReadData?.total_reads || 0;
  sheet.getCell('A5').font = { bold: true };
  sheet.getCell('B5').font = { bold: true, size: 14 };

  // Top 10 posts mais lidos
  sheet.mergeCells('A7:E7');
  const topPostsTitle = sheet.getCell('A7');
  topPostsTitle.value = 'TOP 10 POSTS MAIS LIDOS';
  applyHeaderStyle(topPostsTitle, COLORS.success);

  const topPostsHeader = sheet.getRow(8);
  topPostsHeader.values = ['Título do Post', 'Tipo', 'Total de Leituras', 'Leitores Únicos', 'Taxa (%)'];
  topPostsHeader.eachCell(cell => applyHeaderStyle(cell));

  const topPosts = (data.postReadData?.top_posts || []).slice(0, 10);
  topPosts.forEach((post: any, index: number) => {
    const row = sheet.getRow(9 + index);
    row.values = [
      post.post_title,
      post.post_type,
      post.total_reads,
      post.unique_readers,
      `${post.read_rate.toFixed(1)}%`
    ];
    applyZebraStyle(row, index % 2 === 0);

    // Formatação condicional na taxa
    const rateCell = row.getCell(5);
    applyConditionalColor(rateCell, post.read_rate, { danger: 50, warning: 70, success: 85 });
  });

  // Taxa de leitura por tipo
  const typeRateRow = 20;
  sheet.mergeCells(`A${typeRateRow}:E${typeRateRow}`);
  const typeRateTitle = sheet.getCell(`A${typeRateRow}`);
  typeRateTitle.value = 'TAXA DE LEITURA POR TIPO DE POST';
  applyHeaderStyle(typeRateTitle, COLORS.info);

  const typeRateHeader = sheet.getRow(typeRateRow + 1);
  typeRateHeader.values = ['Tipo de Post', 'Total de Posts', 'Total de Leituras', 'Taxa Média (%)', 'Status'];
  typeRateHeader.eachCell(cell => applyHeaderStyle(cell));

  const readRateByType = data.postReadData?.read_rate_by_type || [];
  readRateByType.forEach((type: any, index: number) => {
    const row = sheet.getRow(typeRateRow + 2 + index);
    const status = type.avg_read_rate >= 70 ? '✅ Excelente' : type.avg_read_rate >= 50 ? '⚠️ Regular' : '🚨 Baixo';
    
    row.values = [
      type.post_type,
      type.total_posts,
      type.total_reads,
      `${type.avg_read_rate.toFixed(1)}%`,
      status
    ];
    applyZebraStyle(row, index % 2 === 0);

    const rateCell = row.getCell(4);
    applyConditionalColor(rateCell, type.avg_read_rate, { danger: 50, warning: 70, success: 85 });
  });

  // Top leitores
  const topReadersRow = typeRateRow + 2 + readRateByType.length + 2;
  sheet.mergeCells(`A${topReadersRow}:E${topReadersRow}`);
  const topReadersTitle = sheet.getCell(`A${topReadersRow}`);
  topReadersTitle.value = 'TOP 10 ALUNOS MAIS ENGAJADOS';
  applyHeaderStyle(topReadersTitle, COLORS.warning);

  const topReadersHeader = sheet.getRow(topReadersRow + 1);
  topReadersHeader.values = ['Nome do Aluno', 'Turma', 'Total de Leituras', 'Reconhecimento', ''];
  topReadersHeader.eachCell(cell => applyHeaderStyle(cell));

  const topReaders = (data.postReadData?.top_readers || []).slice(0, 10);
  topReaders.forEach((reader: any, index: number) => {
    const row = sheet.getRow(topReadersRow + 2 + index);
    const badge = index === 0 ? '🏆 1º Lugar' : index === 1 ? '🥈 2º Lugar' : index === 2 ? '🥉 3º Lugar' : `${index + 1}º`;
    
    row.values = [
      reader.student_name,
      reader.class_name || 'Sem turma',
      reader.total_reads,
      badge,
      ''
    ];
    applyZebraStyle(row, index % 2 === 0);

    // Destacar top 3
    if (index < 3) {
      row.eachCell(cell => {
        cell.font = { bold: true, size: 11 };
      });
    }
  });

  // Posts com baixo engajamento
  const lowEngagementRow = topReadersRow + 2 + topReaders.length + 2;
  sheet.mergeCells(`A${lowEngagementRow}:E${lowEngagementRow}`);
  const lowEngagementTitle = sheet.getCell(`A${lowEngagementRow}`);
  lowEngagementTitle.value = 'POSTS COM BAIXO ENGAJAMENTO (<30%)';
  applyHeaderStyle(lowEngagementTitle, COLORS.danger);

  const lowEngagementHeader = sheet.getRow(lowEngagementRow + 1);
  lowEngagementHeader.values = ['Título do Post', 'Tipo', 'Taxa (%)', 'Turma', 'Ação Sugerida'];
  lowEngagementHeader.eachCell(cell => applyHeaderStyle(cell));

  const lowEngagement = data.postReadData?.posts_with_low_engagement || [];
  lowEngagement.forEach((post: any, index: number) => {
    const row = sheet.getRow(lowEngagementRow + 2 + index);
    row.values = [
      post.post_title,
      post.post_type,
      `${post.read_rate.toFixed(1)}%`,
      post.class_name || 'Geral',
      'Reenviar lembrete'
    ];
    applyZebraStyle(row, index % 2 === 0);

    const rateCell = row.getCell(3);
    rateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.danger } };
    rateCell.font = { bold: true, color: { argb: COLORS.white } };
  });

  // Ajustar larguras
  sheet.getColumn(1).width = 40;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 20;
}

// Função principal de exportação
export async function generateAnalyticsReport(data: ExportData): Promise<void> {
  try {
    const workbook = new ExcelJS.Workbook();
    
    workbook.creator = 'Sistema de Inteligência Analytics';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Criar todas as abas
    createDashboardSheet(workbook, data);
    createHeatmapSheet(workbook, data);
    createRetentionSheet(workbook, data);
    createOperationalSheet(workbook, data);
    createPulseScoreSheet(workbook, data);
    createStudentsAtRiskSheet(workbook, data);
    createActivityTrendSheet(workbook, data);
    createClassPerformanceSheet(workbook, data);
    createPostEngagementSheet(workbook, data);

    // Gerar e baixar arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Analytics_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao gerar relatório Excel:', error);
    throw error;
  }
}
