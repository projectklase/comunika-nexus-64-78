import jsPDF from 'jspdf';
import klaseLogoPng from '@/assets/Logo_Klase_Chromado.png';

interface AdminOnboardingPDFData {
  adminName: string;
  schoolName: string;
  planName: string;
  maxStudents: number;
  email: string;
  password: string;
}

// Cache for logo base64
let logoBase64Cache: string | null = null;

async function loadLogoAsBase64(): Promise<string> {
  if (logoBase64Cache) return logoBase64Cache;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        logoBase64Cache = canvas.toDataURL('image/png');
        resolve(logoBase64Cache);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load logo'));
    img.src = klaseLogoPng;
  });
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
  gold: [255, 215, 0] as [number, number, number],
};

// ============= ICON DRAWING FUNCTIONS =============

function drawStarIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const outerR = size / 2;
  const innerR = size / 4;
  const points: [number, number][] = [];
  
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 2) + (i * Math.PI / 5);
    const r = i % 2 === 0 ? outerR : innerR;
    points.push([cx + r * Math.cos(angle), cy - r * Math.sin(angle)]);
  }
  
  doc.setLineWidth(0);
  doc.triangle(points[0][0], points[0][1], points[1][0], points[1][1], points[9][0], points[9][1], 'F');
  for (let i = 1; i < 9; i += 2) {
    doc.triangle(cx, cy, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], 'F');
    if (i + 2 < 10) {
      doc.triangle(cx, cy, points[i + 1][0], points[i + 1][1], points[i + 2][0], points[i + 2][1], 'F');
    }
  }
}

function drawDiamondIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2;
  
  // Draw diamond shape
  doc.triangle(cx, cy - r, cx + r, cy, cx, cy + r * 0.3, 'F');
  doc.triangle(cx, cy - r, cx - r, cy, cx, cy + r * 0.3, 'F');
  doc.triangle(cx - r, cy, cx, cy + r, cx, cy + r * 0.3, 'F');
  doc.triangle(cx + r, cy, cx, cy + r, cx, cy + r * 0.3, 'F');
}

function drawPeopleIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const headR = size * 0.15;
  
  // Person 1
  doc.circle(x + size * 0.35, y + size * 0.25, headR, 'F');
  doc.ellipse(x + size * 0.35, y + size * 0.55, size * 0.15, size * 0.2, 'F');
  
  // Person 2
  doc.circle(x + size * 0.65, y + size * 0.25, headR, 'F');
  doc.ellipse(x + size * 0.65, y + size * 0.55, size * 0.15, size * 0.2, 'F');
}

function drawKeyIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  // Key head (circle)
  doc.circle(x + size * 0.3, y + size * 0.35, size * 0.2, 'F');
  doc.setFillColor(...COLORS.cardBg);
  doc.circle(x + size * 0.3, y + size * 0.35, size * 0.08, 'F');
  doc.setFillColor(...color);
  // Key shaft
  doc.rect(x + size * 0.4, y + size * 0.3, size * 0.5, size * 0.1, 'F');
  // Key teeth
  doc.rect(x + size * 0.75, y + size * 0.4, size * 0.08, size * 0.15, 'F');
  doc.rect(x + size * 0.85, y + size * 0.4, size * 0.08, size * 0.1, 'F');
}

function drawCompassIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size * 0.4;
  
  // Outer circle
  doc.setDrawColor(...color);
  doc.setLineWidth(1.5);
  doc.circle(cx, cy, r, 'S');
  
  // Arrow pointing up
  doc.setFillColor(...color);
  doc.triangle(cx, cy - r + 2, cx - 3, cy, cx + 3, cy, 'F');
  doc.triangle(cx, cy + r - 2, cx - 3, cy, cx + 3, cy, 'F');
  
  // Center dot
  doc.circle(cx, cy, 2, 'F');
}

function drawGearIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  const cy = y + size / 2;
  
  // Main circle
  doc.circle(cx, cy, size * 0.25, 'F');
  
  // Teeth around gear
  const teeth = 8;
  for (let i = 0; i < teeth; i++) {
    const angle = (i * Math.PI * 2) / teeth;
    const tx = cx + Math.cos(angle) * size * 0.35;
    const ty = cy + Math.sin(angle) * size * 0.35;
    doc.circle(tx, ty, size * 0.08, 'F');
  }
  
  // Inner hole
  doc.setFillColor(...COLORS.cardBg);
  doc.circle(cx, cy, size * 0.1, 'F');
}

function drawDownloadIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  
  // Arrow down
  doc.triangle(cx, y + size * 0.6, cx - size * 0.2, y + size * 0.35, cx + size * 0.2, y + size * 0.35, 'F');
  doc.rect(cx - size * 0.08, y + size * 0.1, size * 0.16, size * 0.3, 'F');
  
  // Tray
  doc.rect(x + size * 0.15, y + size * 0.7, size * 0.7, size * 0.1, 'F');
}

function drawDocIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Document body
  doc.roundedRect(x + size * 0.2, y + size * 0.1, size * 0.6, size * 0.8, 1, 1, 'F');
  
  // Lines on document
  doc.setFillColor(...COLORS.cardBg);
  doc.rect(x + size * 0.3, y + size * 0.3, size * 0.4, size * 0.06, 'F');
  doc.rect(x + size * 0.3, y + size * 0.45, size * 0.4, size * 0.06, 'F');
  doc.rect(x + size * 0.3, y + size * 0.6, size * 0.25, size * 0.06, 'F');
}

function drawGamepadIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Main body
  doc.roundedRect(x + size * 0.1, y + size * 0.3, size * 0.8, size * 0.4, 3, 3, 'F');
  
  // Left stick area
  doc.setFillColor(...COLORS.cardBg);
  doc.circle(x + size * 0.3, y + size * 0.5, size * 0.1, 'F');
  
  // Right buttons
  doc.circle(x + size * 0.7, y + size * 0.45, size * 0.06, 'F');
  doc.circle(x + size * 0.7, y + size * 0.55, size * 0.06, 'F');
}

function drawBrainIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  
  // Brain lobes (simplified as overlapping circles)
  doc.circle(cx - size * 0.15, y + size * 0.35, size * 0.2, 'F');
  doc.circle(cx + size * 0.15, y + size * 0.35, size * 0.2, 'F');
  doc.circle(cx - size * 0.1, y + size * 0.55, size * 0.18, 'F');
  doc.circle(cx + size * 0.1, y + size * 0.55, size * 0.18, 'F');
  doc.circle(cx, y + size * 0.45, size * 0.15, 'F');
}

function drawChatIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Chat bubble
  doc.roundedRect(x + size * 0.1, y + size * 0.15, size * 0.8, size * 0.5, 3, 3, 'F');
  
  // Triangle pointer
  doc.triangle(
    x + size * 0.25, y + size * 0.65,
    x + size * 0.4, y + size * 0.65,
    x + size * 0.2, y + size * 0.8,
    'F'
  );
  
  // Dots inside
  doc.setFillColor(...COLORS.cardBg);
  doc.circle(x + size * 0.35, y + size * 0.4, size * 0.05, 'F');
  doc.circle(x + size * 0.5, y + size * 0.4, size * 0.05, 'F');
  doc.circle(x + size * 0.65, y + size * 0.4, size * 0.05, 'F');
}

function drawTrophyIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Cup body
  doc.roundedRect(x + size * 0.25, y + size * 0.1, size * 0.5, size * 0.45, 2, 2, 'F');
  
  // Handles
  doc.setDrawColor(...color);
  doc.setLineWidth(1.5);
  doc.circle(x + size * 0.15, y + size * 0.3, size * 0.1, 'S');
  doc.circle(x + size * 0.85, y + size * 0.3, size * 0.1, 'S');
  
  // Stem
  doc.setFillColor(...color);
  doc.rect(x + size * 0.4, y + size * 0.55, size * 0.2, size * 0.2, 'F');
  
  // Base
  doc.rect(x + size * 0.3, y + size * 0.75, size * 0.4, size * 0.1, 'F');
}

function drawCoinIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  doc.circle(x + size / 2, y + size / 2, size * 0.4, 'F');
  
  // K letter inside
  doc.setFillColor(...COLORS.cardBg);
  doc.setFontSize(size * 0.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.cardBg);
  doc.text('K', x + size * 0.35, y + size * 0.6);
}

function drawFireIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  
  // Flame shape (multiple triangles)
  doc.triangle(cx, y + size * 0.1, cx - size * 0.25, y + size * 0.7, cx + size * 0.25, y + size * 0.7, 'F');
  doc.triangle(cx - size * 0.15, y + size * 0.25, cx - size * 0.35, y + size * 0.7, cx, y + size * 0.6, 'F');
  doc.triangle(cx + size * 0.15, y + size * 0.25, cx + size * 0.35, y + size * 0.7, cx, y + size * 0.6, 'F');
  
  // Inner flame
  doc.setFillColor(255, 200, 100);
  doc.triangle(cx, y + size * 0.35, cx - size * 0.12, y + size * 0.7, cx + size * 0.12, y + size * 0.7, 'F');
}

function drawCardsIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  // Back card
  doc.setFillColor(...COLORS.textMuted);
  doc.roundedRect(x + size * 0.3, y + size * 0.1, size * 0.5, size * 0.7, 2, 2, 'F');
  
  // Front card
  doc.setFillColor(...color);
  doc.roundedRect(x + size * 0.15, y + size * 0.2, size * 0.5, size * 0.7, 2, 2, 'F');
  
  // Card symbol
  doc.setFillColor(...COLORS.text);
  doc.circle(x + size * 0.4, y + size * 0.5, size * 0.08, 'F');
}

function drawShopIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Bag body
  doc.roundedRect(x + size * 0.2, y + size * 0.35, size * 0.6, size * 0.55, 2, 2, 'F');
  
  // Bag handle
  doc.setDrawColor(...color);
  doc.setLineWidth(2);
  doc.setFillColor(...COLORS.cardBg);
  doc.ellipse(x + size * 0.5, y + size * 0.3, size * 0.15, size * 0.15, 'S');
}

function drawChartIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Bars
  doc.rect(x + size * 0.15, y + size * 0.5, size * 0.15, size * 0.35, 'F');
  doc.rect(x + size * 0.4, y + size * 0.3, size * 0.15, size * 0.55, 'F');
  doc.rect(x + size * 0.65, y + size * 0.15, size * 0.15, size * 0.7, 'F');
}

function drawLinkIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(2);
  
  // Two chain links
  doc.ellipse(x + size * 0.35, y + size * 0.5, size * 0.15, size * 0.25, 'S');
  doc.ellipse(x + size * 0.65, y + size * 0.5, size * 0.15, size * 0.25, 'S');
}

function drawLightbulbIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  const cx = x + size / 2;
  
  // Bulb
  doc.circle(cx, y + size * 0.35, size * 0.25, 'F');
  
  // Base
  doc.rect(cx - size * 0.12, y + size * 0.6, size * 0.24, size * 0.15, 'F');
  
  // Rays
  doc.setDrawColor(...color);
  doc.setLineWidth(1);
  doc.line(cx, y + size * 0.02, cx, y + size * 0.1);
  doc.line(x + size * 0.15, y + size * 0.2, x + size * 0.25, y + size * 0.28);
  doc.line(x + size * 0.85, y + size * 0.2, x + size * 0.75, y + size * 0.28);
}

function drawRobotIcon(doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) {
  doc.setFillColor(...color);
  
  // Head
  doc.roundedRect(x + size * 0.25, y + size * 0.15, size * 0.5, size * 0.4, 2, 2, 'F');
  
  // Eyes
  doc.setFillColor(...COLORS.cardBg);
  doc.circle(x + size * 0.38, y + size * 0.32, size * 0.07, 'F');
  doc.circle(x + size * 0.62, y + size * 0.32, size * 0.07, 'F');
  
  // Antenna
  doc.setFillColor(...color);
  doc.rect(x + size * 0.47, y + size * 0.05, size * 0.06, size * 0.12, 'F');
  doc.circle(x + size * 0.5, y + size * 0.05, size * 0.05, 'F');
  
  // Body
  doc.rect(x + size * 0.3, y + size * 0.58, size * 0.4, size * 0.3, 'F');
}

// ============= LAYOUT HELPER FUNCTIONS =============

function drawGradientHeader(doc: jsPDF, yStart: number, height: number) {
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

function drawBulletPoint(doc: jsPDF, x: number, y: number, text: string) {
  doc.setFillColor(...COLORS.primary);
  doc.circle(x, y + 2, 2, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.text(text, x + 6, y + 4);
}

function drawNumberedStep(doc: jsPDF, x: number, y: number, number: number, title: string, description: string) {
  // Círculo com número - CENTRALIZADO
  doc.setFillColor(...COLORS.primary);
  doc.circle(x + 8, y + 8, 8, 'F');
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  // Centralizar número no círculo
  const numStr = number.toString();
  const numWidth = doc.getTextWidth(numStr);
  doc.text(numStr, x + 8 - numWidth / 2, y + 11);
  
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

function drawSectionTitle(doc: jsPDF, y: number, title: string, iconFn?: (doc: jsPDF, x: number, y: number, size: number, color: [number, number, number]) => void) {
  doc.setFillColor(...COLORS.primary);
  doc.rect(15, y, 4, 20, 'F');
  
  // Draw icon if provided
  if (iconFn) {
    iconFn(doc, 23, y + 2, 16, COLORS.primary);
  }
  
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const textX = iconFn ? 43 : 25;
  doc.text(title, textX, y + 14);
  
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

function addLogoImage(doc: jsPDF, logoBase64: string, cx: number, cy: number) {
  // Logo size - ideal for PDF cover (40mm width, maintaining aspect ratio ~1:1.2)
  const logoWidth = 45;
  const logoHeight = 55;
  
  // Center the logo
  const x = cx - logoWidth / 2;
  const y = cy - logoHeight / 2;
  
  // Add the premium chrome logo
  doc.addImage(logoBase64, 'PNG', x, y, logoWidth, logoHeight);
}

export async function generateAdminOnboardingPDF(data: AdminOnboardingPDFData): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const totalPages = 8;
  
  // Load the premium logo
  const logoBase64 = await loadLogoAsBase64();
  
  // ========== PÁGINA 1 - CAPA ==========
  drawPageBackground(doc);
  drawGradientHeader(doc, 0, 120);
  
  // Logo premium cromada
  addLogoImage(doc, logoBase64, 105, 55);
  
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
  
  let y = drawSectionTitle(doc, 20, 'Bem-vindo ao Klase', drawStarIcon);
  
  drawCard(doc, 15, y, 180, 50);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  
  // Primeira linha: "O Klase é uma plataforma de inteligência educacional desenhada para"
  doc.setFont('helvetica', 'normal');
  doc.text('O Klase e uma plataforma de inteligencia educacional desenhada para', 20, y + 10);
  
  // Segunda linha com NEGRITO: "blindar a receita e atrair novas matriculas"
  doc.setFont('helvetica', 'bold');
  doc.text('blindar a receita e atrair novas matriculas', 20, y + 15);
  
  // Continuação normal
  doc.setFont('helvetica', 'normal');
  doc.text('atraves da gamificacao estrategica. Mais do que engajamento, nosso', 20, y + 20);
  doc.text("ecossistema atua na retencao ativa da base enquanto o 'fator comunidade'", 20, y + 25);
  doc.text('desperta o desejo de novos alunos organicamente. Transformamos dados em', 20, y + 30);
  doc.text('previsibilidade financeira e sua escola em uma referencia de inovacao.', 20, y + 35);
  
  y += 55;
  y = drawSectionTitle(doc, y, 'Principais Benefícios', drawDiamondIcon);
  
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
  
  drawFooter(doc, 2, totalPages);
  
  // ========== PÁGINA 3 - ESTRUTURA E PRIMEIRO ACESSO ==========
  doc.addPage();
  drawPageBackground(doc);
  
  // Estrutura de Usuários (movido da página 2)
  y = drawSectionTitle(doc, 20, 'Estrutura de Usuários', drawPeopleIcon);
  
  const roles = [
    'Administrador - Gestao completa da escola',
    'Secretaria - Cadastros e gestao diaria',
    'Professor - Turmas, atividades e notas',
    'Aluno - Aprendizado gamificado'
  ];
  
  roles.forEach((role, i) => {
    drawBulletPoint(doc, 20, y + (i * 12), role);
  });
  
  y += 55;
  y = drawSectionTitle(doc, y, 'Primeiro Acesso', drawKeyIcon);
  
  drawCard(doc, 15, y, 180, 65);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  doc.text('Acesse a plataforma em:', 20, y + 12);
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('https://app.klasetech.com/', 20, y + 25);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Email: ${data.email}`, 20, y + 38);
  doc.setTextColor(...COLORS.text);
  doc.text('Senha:', 20, y + 50);
  doc.setTextColor(...COLORS.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(data.password, 40, y + 50);
  
  y += 80;
  y = drawSectionTitle(doc, y, 'Navegação Básica', drawCompassIcon);
  
  const navItems = [
    { title: 'Menu Lateral', desc: 'Acesso rápido a todas as funcionalidades principais' },
    { title: 'Dashboard', desc: 'Visão geral com métricas e insights da escola' },
    { title: 'Notificações', desc: 'Acompanhe entregas, eventos e alertas importantes' },
    { title: 'Configurações', desc: 'Personalize sua escola e preferências' },
  ];
  
  navItems.forEach((item, i) => {
    y = drawNumberedStep(doc, 15, y, i + 1, item.title, item.desc);
    y += 5;
  });
  
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.warning);
  doc.setFont('helvetica', 'bold');
  doc.text('! Dica de Seguranca:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Recomendamos alterar sua senha no primeiro acesso.', 58, y);
  
  drawFooter(doc, 3, totalPages);
  
  // ========== PÁGINA 4 - CONFIGURAÇÃO INICIAL ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Configuração Inicial', drawGearIcon);
  
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
    // Centralizar número
    const stepNum = (i + 1).toString();
    const stepNumWidth = doc.getTextWidth(stepNum);
    doc.text(stepNum, 27 - stepNumWidth / 2, y + 21);
    
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
  drawLightbulbIcon(doc, 18, y + 5, 18, COLORS.accent);
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Atalho Rápido', 40, y + 12);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Use o menu "Cadastros" para acessar todas as opções rapidamente.', 40, y + 22);
  
  drawFooter(doc, 4, totalPages);
  
  // ========== PÁGINA 5 - IMPORTAÇÃO DE ALUNOS ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Importação de Alunos', drawDownloadIcon);
  
  drawCard(doc, 15, y, 180, 35);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(11);
  const importIntro = 'O Klase oferece importação em massa via CSV, permitindo cadastrar centenas de alunos em minutos. O sistema é inteligente e adapta os campos automaticamente.';
  const importLines = doc.splitTextToSize(importIntro, 170);
  doc.text(importLines, 20, y + 15);
  
  y += 45;
  y = drawSectionTitle(doc, y, 'Campos do CSV', drawDocIcon);
  
  const fields = [
    { name: 'nome', req: 'Obrigatório', desc: 'Nome completo do aluno' },
    { name: 'data_nasc', req: 'Obrigatório', desc: 'Data de nascimento (DD/MM/AAAA)' },
    { name: 'email', req: 'Adultos 18+', desc: 'Email do aluno (login)' },
    { name: 'responsavel_email', req: 'Menores', desc: 'Email do responsável (login)' },
    { name: 'telefone', req: 'Opcional', desc: 'Telefone de contato' },
    { name: 'matricula', req: 'Opcional', desc: 'Número de matrícula' },
  ];
  
  fields.forEach((field, i) => {
    const isRequired = field.req.includes('Obrigatório') || field.req.includes('18+') || field.req.includes('Menores');
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
  drawCard(doc, 15, y, 180, 32);
  drawBrainIcon(doc, 18, y + 8, 18, COLORS.accent);
  doc.setTextColor(...COLORS.accent);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Sistema Inteligente de Idade', 40, y + 12);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const ageText = 'O sistema calcula automaticamente a idade do aluno. Adultos (18+ anos) usam seu próprio email para login. Menores usam o email do responsável.';
  const ageLines = doc.splitTextToSize(ageText, 150);
  doc.text(ageLines, 40, y + 22);
  
  drawFooter(doc, 5, totalPages);
  
  // ========== PÁGINA 6 - GAMIFICAÇÃO ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Gamificação', drawGamepadIcon);
  
  const gamification = [
    { icon: drawCoinIcon, title: 'Sistema de Koins', desc: 'Moeda virtual que alunos ganham ao completar atividades, desafios e manter streak de check-ins. Podem trocar por recompensas na loja.' },
    { icon: drawTrophyIcon, title: 'Desafios', desc: 'Missões diárias e semanais que incentivam engajamento. "Leia 3 avisos", "Complete o perfil", etc.' },
    { icon: drawFireIcon, title: 'Streak de Check-ins', desc: 'Alunos ganham XP e Koins ao fazer check-in diário. Streaks consecutivos multiplicam recompensas.' },
    { icon: drawCardsIcon, title: 'Klase Kards Arena', desc: 'Jogo de cartas colecionáveis onde alunos usam XP para abrir pacotes e batalham entre si.' },
  ];
  
  gamification.forEach((item, i) => {
    drawCard(doc, 15, y, 180, 32);
    item.icon(doc, 18, y + 6, 18, COLORS.gold);
    doc.setTextColor(...COLORS.text);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(item.title, 42, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textMuted);
    const descLines = doc.splitTextToSize(item.desc, 145);
    doc.text(descLines, 42, y + 18);
    y += 38;
  });
  
  y += 10;
  y = drawSectionTitle(doc, y, 'Loja de Recompensas', drawShopIcon);
  
  drawCard(doc, 15, y, 180, 30);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  const storeText = 'Configure itens na loja para que alunos troquem seus Koins: materiais escolares, brindes, privilégios especiais, etc. Você define os preços e estoque.';
  const storeLines = doc.splitTextToSize(storeText, 165);
  doc.text(storeLines, 20, y + 16);
  
  drawFooter(doc, 6, totalPages);
  
  // ========== PÁGINA 7 - INTELIGÊNCIA ==========
  doc.addPage();
  drawPageBackground(doc);
  
  y = drawSectionTitle(doc, 20, 'Inteligência & Relatórios', drawBrainIcon);
  
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
  y = drawSectionTitle(doc, y, 'IA Preditiva', drawRobotIcon);
  
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
  y = drawSectionTitle(doc, y, 'Histórico & Auditoria', drawChartIcon);
  
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
  
  y = drawSectionTitle(doc, 20, 'Suporte & Ajuda', drawChatIcon);
  
  drawCard(doc, 15, y, 180, 60);
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Precisa de ajuda?', 20, y + 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.textMuted);
  doc.text('Email: lucas@klasetech.com', 20, y + 30);
  doc.text('Horário: Seg-Sex, 8h às 18h', 20, y + 42);
  
  y += 60;
  y = drawSectionTitle(doc, y, 'Links Úteis', drawLinkIcon);
  
  drawCard(doc, 15, y, 180, 30);
  doc.setTextColor(...COLORS.textMuted);
  doc.setFontSize(10);
  doc.text('Em breve - Documentação e Central de Ajuda', 20, y + 18);
  
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

export async function downloadAdminOnboardingPDF(data: AdminOnboardingPDFData): Promise<void> {
  const blob = await generateAdminOnboardingPDF(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Klase_Guia_Onboarding_${data.schoolName.replace(/\s+/g, '_')}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
