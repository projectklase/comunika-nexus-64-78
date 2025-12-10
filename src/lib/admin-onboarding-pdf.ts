import jsPDF from 'jspdf';

interface AdminOnboardingPDFData {
  adminName: string;
  schoolName: string;
  planName: string;
  maxStudents: number;
  email: string;
}

// Klase brand colors
const COLORS = {
  primary: [139, 92, 246] as [number, number, number], // Purple
  primaryDark: [109, 40, 217] as [number, number, number],
  background: [15, 10, 25] as [number, number, number],
  cardBg: [25, 20, 40] as [number, number, number],
  text: [255, 255, 255] as [number, number, number],
  textMuted: [156, 163, 175] as [number, number, number],
  accent: [34, 197, 94] as [number, number, number], // Green
  warning: [251, 191, 36] as [number, number, number], // Yellow
};

function drawGradientHeader(doc: jsPDF, yStart: number, height: number) {
  // Simular gradiente com retângulos
  const steps = 20;
  const stepHeight = height / steps;
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(COLORS.primaryDark[0] + (COLORS.primary[0] - COLORS.primaryDark[0]) * ratio);
    const g = Math.round(COLORS.primaryDark[1] + (COLORS.primary[1] - COLORS.primaryDark[1]) * ratio);
    const b = Math.round(COLORS.primaryDark[2] + (COLORS.primary[2] - COLORS.primaryDark[2]) * ratio);
    
    doc.setFillColor(r, g, b);
    doc.rect(0, yStart + (i * stepHeight), 210, stepHeight + 1, 'F');
  }
}

function drawPageBackground(doc: jsPDF) {
  doc.setFillColor(...COLORS.background);
  doc.rect(0, 0, 210, 297, 'F');
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(...COLORS.cardBg);
  doc.roundedRect(x, y, width, height, 3, 3, 'F');
}

function drawBulletPoint(doc: jsPDF, x: number, y: number, text: string, icon?: string) {
  doc.setFillColor(...COLORS.primary);
  doc.circle(x, y + 2, 2, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.text(text, x + 6, y + 4);
}

function drawNumberedStep(doc: jsPDF, x: number, y: number, number: number, title: string, description: string) {
  // Círculo com número
  doc.setFillColor(...COLORS.primary);
  doc.circle(x + 8, y + 8, 8, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(number.toString(), x + 6, y + 11);
  
  // Título
  doc.setFontSize(12);
  doc.text(title, x + 22, y + 6);
  
  // Descrição
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMuted);
  const lines = doc.splitTextToSize(description, 150);
  doc.text(lines, x + 22, y + 14);
  
  return y + 10 + (lines.length * 5);
}

function drawSectionTitle(doc: jsPDF, y: number, title: string, emoji?: string) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(15, y, 4, 20, 'F');
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`${emoji || ''} ${title}`.trim(), 25, y + 14);
  
  return y + 30;
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  doc.setFillColor(...COLORS.cardBg);
  doc.rect(0, 280, 210, 17, 'F');
  
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Klase - Plataforma Educacional Gamificada', 15, 290);
  doc.text(`Página ${pageNum} de ${totalPages}`, 180, 290);
}

export function generateAdminOnboardingPDF(data: AdminOnboardingPDFData): Blob {
  const doc = new jsPDF('p', 'mm', 'a4');
  const totalPages = 8;
  
  // ========== PÁGINA 1 - CAPA ==========
  drawPageBackground(doc);
  drawGradientHeader(doc, 0, 120);
  
  // Logo placeholder (círculo estilizado)
  doc.setFillColor(...COLORS.text);
  doc.circle(105, 50, 25, 'F');
  doc.setFillColor(...COLORS.primary);
  doc.circle(105, 50, 22, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('K', 100, 57);
  
  // Título principal
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Guia de Primeiros Passos', 105, 95, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Klase - Plataforma Educacional Gamificada', 105, 108, { align: 'center' });
  
  // Card personalizado
  drawCard(doc, 25, 140, 160, 70);
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Preparado especialmente para:', 35, 158);
  
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.primary);
  doc.text(data.adminName, 35, 175);
  
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  doc.text(`Escola: ${data.schoolName}`, 35, 188);
  doc.text(`Plano: ${data.planName} (até ${data.maxStudents} alunos)`, 35, 198);
  
  // Data de geração
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  const hoje = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  doc.text(`Gerado em ${hoje}`, 105, 250, { align: 'center' });
  
  drawFooter(doc, 1, totalPages);
  
  // ========== PÁGINA 2 - VISÃO GERAL ==========
  doc.addPage();
  drawPageBackground(doc);
  
  let y = drawSectionTitle(doc, 20, 'Bem-vindo ao Klase', '🎉');
  
  drawCard(doc, 15, y, 180, 60);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const introText = `O Klase é uma plataforma educacional completa que transforma a gestão escolar através da gamificação. Nosso objetivo é aumentar o engajamento dos alunos, simplificar a administração e fornecer insights valiosos para decisões pedagógicas.`;
  const introLines = doc.splitTextToSize(introText, 170);
  doc.text(introLines, 20, y + 15);
  
  y += 75;
  y = drawSectionTitle(doc, y, 'Principais Benefícios', '✨');
  
  const benefits = [
    { title: 'Gamificação Completa', desc: 'Sistema de Koins, desafios, conquistas e jogo de cartas colecionáveis' },
    { title: 'IA Preditiva', desc: 'Insights inteligentes sobre evasão, engajamento e performance' },
    { title: 'Multi-Escola', desc: 'Gerencie múltiplas escolas em uma única conta' },
    { title: 'Comunicação Integrada', desc: 'Posts, avisos, eventos e atividades em um só lugar' },
  ];
  
  benefits.forEach((b, i) => {
    drawCard(doc, 15, y, 180, 25);
    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(b.title, 20, y + 10);
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(b.desc, 20, y + 18);
    y += 30;
  });
  
  y += 10;
  y = drawSectionTitle(doc, y, 'Estrutura de Usuários', '👥');
  
  const roles = [
    'Administrador → Gestão completa da escola',
    'Secretária → Cadastros e gestão diária',
    'Professor → Turmas, atividades e notas',
    'Aluno → Aprendizado gamificado'
  ];
  
  roles.forEach((role, i) => {
    drawBulletPoint(doc, 20, y + (i * 12), role);
  });
  
  drawFooter(doc, 2, totalPages);
  
  // ========== PÁGINA 3 - PRIMEIRO ACESSO ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Primeiro Acesso', '🔑');
  
  drawCard(doc, 15, y, 180, 45);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.text('Acesse a plataforma em:', 20, y + 12);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('https://klase.app', 20, y + 25);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Use o email: ${data.email}`, 20, y + 36);
  
  y += 60;
  y = drawSectionTitle(doc, y, 'Navegação Básica', '🧭');
  
  const navItems = [
    { title: 'Menu Lateral', desc: 'Acesso rápido a todas as funcionalidades principais' },
    { title: 'Dashboard', desc: 'Visão geral com métricas e insights da escola' },
    { title: 'Notificações', desc: 'Acompanhe entregas, eventos e alertas importantes' },
    { title: 'Configurações', desc: 'Personalize sua escola e preferências' },
  ];
  
  navItems.forEach((item, i) => {
    y = drawNumberedStep(doc, 15, y, i + 1, item.title, item.desc);
    y += 8;
  });
  
  y += 15;
  drawCard(doc, 15, y, 180, 35);
  doc.setFillColor(...COLORS.warning);
  doc.circle(25, y + 17, 5, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('!', 23.5, y + 20);
  doc.text('Dica de Segurança', 35, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Recomendamos alterar sua senha no primeiro acesso.', 35, y + 24);
  
  drawFooter(doc, 3, totalPages);
  
  // ========== PÁGINA 4 - CONFIGURAÇÃO INICIAL ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Configuração Inicial', '⚙️');
  
  const setupSteps = [
    { title: 'Cadastrar Secretárias', desc: 'Delegue a gestão diária para sua equipe administrativa. Secretárias podem cadastrar professores, alunos e gerenciar turmas.' },
    { title: 'Cadastrar Professores', desc: 'Adicione os professores da escola. Eles terão acesso às turmas atribuídas para criar atividades e registrar notas.' },
    { title: 'Criar Níveis e Modalidades', desc: 'Configure a estrutura curricular: Ensino Fundamental, Médio, EJA, etc. Esta estrutura organiza suas turmas.' },
    { title: 'Criar Turmas', desc: 'Crie as turmas vinculando um professor principal, nível e modalidade. As turmas são o centro da organização escolar.' },
  ];
  
  setupSteps.forEach((step, i) => {
    drawCard(doc, 15, y, 180, 35);
    doc.setFillColor(...COLORS.primary);
    doc.circle(27, y + 17, 10, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text((i + 1).toString(), 24, y + 21);
    
    doc.setFontSize(12);
    doc.text(step.title, 42, y + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const descLines = doc.splitTextToSize(step.desc, 140);
    doc.text(descLines, 42, y + 20);
    
    y += 42;
  });
  
  y += 5;
  drawCard(doc, 15, y, 180, 30);
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('💡 Atalho Rápido', 20, y + 12);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Use o menu "Cadastros" para acessar todas as opções rapidamente.', 20, y + 22);
  
  drawFooter(doc, 4, totalPages);
  
  // ========== PÁGINA 5 - IMPORTAÇÃO DE ALUNOS ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Importação de Alunos', '📥');
  
  drawCard(doc, 15, y, 180, 35);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  const importIntro = 'O Klase oferece importação em massa via CSV, permitindo cadastrar centenas de alunos em minutos. O sistema é inteligente e adapta os campos automaticamente.';
  const importLines = doc.splitTextToSize(importIntro, 170);
  doc.text(importLines, 20, y + 15);
  
  y += 45;
  y = drawSectionTitle(doc, y, 'Campos do CSV', '📋');
  
  const fields = [
    { name: 'nome', req: 'Obrigatório', desc: 'Nome completo do aluno' },
    { name: 'data_nasc', req: 'Obrigatório', desc: 'Data de nascimento (DD/MM/AAAA)' },
    { name: 'email', req: 'Adultos ≥18', desc: 'Email do aluno (login)' },
    { name: 'responsavel_email', req: 'Menores <18', desc: 'Email do responsável (login)' },
    { name: 'telefone', req: 'Opcional', desc: 'Telefone de contato' },
    { name: 'matricula', req: 'Opcional', desc: 'Número de matrícula' },
  ];
  
  fields.forEach((field, i) => {
    const isRequired = field.req.includes('Obrigatório') || field.req.includes('≥18') || field.req.includes('<18');
    doc.setFillColor(isRequired ? 139 : 75, isRequired ? 92 : 85, isRequired ? 246 : 99);
    doc.roundedRect(15, y, 45, 14, 2, 2, 'F');
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(field.name, 18, y + 9);
    
    doc.setTextColor(isRequired ? COLORS.primary[0] : COLORS.textMuted[0], isRequired ? COLORS.primary[1] : COLORS.textMuted[1], isRequired ? COLORS.primary[2] : COLORS.textMuted[2]);
    doc.setFontSize(8);
    doc.text(field.req, 65, y + 6);
    
    doc.setTextColor(...COLORS.textMuted);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(field.desc, 65, y + 12);
    
    y += 18;
  });
  
  y += 10;
  drawCard(doc, 15, y, 180, 40);
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('✨ Sistema Inteligente de Idade', 20, y + 12);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const ageText = 'O sistema calcula automaticamente a idade do aluno. Adultos (≥18 anos) usam seu próprio email para login. Menores (<18 anos) usam o email do responsável.';
  const ageLines = doc.splitTextToSize(ageText, 165);
  doc.text(ageLines, 20, y + 22);
  
  drawFooter(doc, 5, totalPages);
  
  // ========== PÁGINA 6 - GAMIFICAÇÃO ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Gamificação', '🎮');
  
  const gamification = [
    { title: '🪙 Sistema de Koins', desc: 'Moeda virtual que alunos ganham ao completar atividades, desafios e manter streak de check-ins. Podem trocar por recompensas na loja.' },
    { title: '🏆 Desafios', desc: 'Missões diárias e semanais que incentivam engajamento. "Leia 3 avisos", "Complete o perfil", etc.' },
    { title: '🔥 Streak de Check-ins', desc: 'Alunos ganham XP e Koins ao fazer check-in diário. Streaks consecutivos multiplicam recompensas.' },
    { title: '🃏 Klase Kards Arena', desc: 'Jogo de cartas colecionáveis onde alunos usam XP para abrir pacotes e batalham entre si.' },
  ];
  
  gamification.forEach((item, i) => {
    drawCard(doc, 15, y, 180, 38);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(item.title, 20, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const descLines = doc.splitTextToSize(item.desc, 165);
    doc.text(descLines, 20, y + 22);
    y += 44;
  });
  
  y += 5;
  y = drawSectionTitle(doc, y, 'Loja de Recompensas', '🛍️');
  
  drawCard(doc, 15, y, 180, 35);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  const storeText = 'Configure itens na loja para que alunos troquem seus Koins: materiais escolares, brindes, privilégios especiais, etc. Você define os preços e estoque.';
  const storeLines = doc.splitTextToSize(storeText, 165);
  doc.text(storeLines, 20, y + 15);
  
  drawFooter(doc, 6, totalPages);
  
  // ========== PÁGINA 7 - INTELIGÊNCIA ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Inteligência & Relatórios', '🧠');
  
  drawCard(doc, 15, y, 180, 45);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dashboard Inteligente', 20, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.textMuted);
  const dashText = 'Seu dashboard mostra métricas em tempo real: total de alunos, professores, turmas, posts publicados, entregas pendentes e muito mais.';
  const dashLines = doc.splitTextToSize(dashText, 165);
  doc.text(dashLines, 20, y + 22);
  
  y += 55;
  y = drawSectionTitle(doc, y, 'IA Preditiva', '🤖');
  
  const aiFeatures = [
    'Identificação de alunos em risco de evasão',
    'Análise de padrões de engajamento',
    'Recomendações personalizadas de ação',
    'Alertas automáticos para a gestão',
  ];
  
  aiFeatures.forEach((feature, i) => {
    drawBulletPoint(doc, 20, y + (i * 14), feature);
  });
  
  y += 70;
  y = drawSectionTitle(doc, y, 'Histórico & Auditoria', '📊');
  
  drawCard(doc, 15, y, 180, 40);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  const histText = 'Todas as ações são registradas no histórico. Você pode filtrar por período, usuário, tipo de ação e exportar relatórios em Excel ou PDF.';
  const histLines = doc.splitTextToSize(histText, 165);
  doc.text(histLines, 20, y + 15);
  
  drawFooter(doc, 7, totalPages);
  
  // ========== PÁGINA 8 - SUPORTE ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Suporte & Ajuda', '💬');
  
  drawCard(doc, 15, y, 180, 60);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Precisa de ajuda?', 20, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Email: suporte@klasetech.com', 20, y + 30);
  doc.text('WhatsApp: (11) 99999-9999', 20, y + 42);
  doc.text('Horário: Seg-Sex, 8h às 18h', 20, y + 54);
  
  y += 75;
  y = drawSectionTitle(doc, y, 'Links Úteis', '🔗');
  
  const links = [
    'Central de Ajuda: help.klase.app',
    'Documentação: docs.klase.app',
    'Status do Sistema: status.klase.app',
  ];
  
  links.forEach((link, i) => {
    drawBulletPoint(doc, 20, y + (i * 14), link);
  });
  
  y += 55;
  drawCard(doc, 15, y, 180, 55);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Obrigado por escolher o Klase!', 105, y + 18, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Estamos aqui para transformar a educação', 105, y + 32, { align: 'center' });
  doc.text('junto com você.', 105, y + 42, { align: 'center' });
  
  drawFooter(doc, 8, totalPages);
  
  return doc.output('blob');
}

export function downloadAdminOnboardingPDF(data: AdminOnboardingPDFData): void {
  const blob = generateAdminOnboardingPDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Klase_Guia_Onboarding_${data.schoolName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
