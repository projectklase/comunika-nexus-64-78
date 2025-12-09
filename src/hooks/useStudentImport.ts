import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';
import { useSubscription } from './useSubscription';

export interface ImportStudentRow {
  rowNumber: number;
  nome: string;
  email: string;
  turma?: string;
  data_nasc?: string;
  telefone?: string;
  matricula?: string;
  cpf?: string;
  responsavel_nome?: string;
  responsavel_telefone?: string;
  senha?: string;
  // Validation
  isValid: boolean;
  errors: string[];
  generatedPassword?: string;
  generatedEmail?: string;
}

export interface ImportResult {
  success: boolean;
  studentId?: string;
  email: string;
  password: string;
  name: string;
  error?: string;
}

export interface ImportSummary {
  total: number;
  succeeded: number;
  failed: number;
  results: ImportResult[];
}

interface ClassInfo {
  id: string;
  code: string;
  name: string;
}

export function useStudentImport() {
  const { currentSchool } = useSchool();
  const { validateStudentCreation } = useSubscription();
  
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [parsedRows, setParsedRows] = useState<ImportStudentRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);

  // Gerar email automático baseado no nome
  const generateEmail = useCallback((name: string, schoolSlug?: string): string => {
    const cleanName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z\s]/g, '') // Remove caracteres especiais
      .trim();
    
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || 'aluno';
    const lastName = parts[parts.length - 1] || '';
    const slug = schoolSlug || currentSchool?.slug || 'escola';
    
    // Adicionar número aleatório para evitar duplicatas
    const random = Math.floor(Math.random() * 1000);
    
    return `${firstName}.${lastName}${random}@${slug}.klase.com.br`;
  }, [currentSchool?.slug]);

  // Gerar senha automática
  const generatePassword = useCallback((name: string): string => {
    const firstName = name.split(' ')[0];
    const year = new Date().getFullYear();
    return `${firstName}${year}!`;
  }, []);

  // Buscar turmas da escola
  const fetchClasses = useCallback(async () => {
    if (!currentSchool) return;
    
    const { data } = await supabase
      .from('classes')
      .select('id, code, name')
      .eq('school_id', currentSchool.id)
      .eq('status', 'Ativa');
    
    setAvailableClasses(data || []);
  }, [currentSchool?.id]);

  // Detectar delimitador CSV
  const detectDelimiter = useCallback((line: string): string => {
    const semicolonCount = (line.match(/;/g) || []).length;
    const commaCount = (line.match(/,/g) || []).length;
    const tabCount = (line.match(/\t/g) || []).length;
    
    if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
    if (semicolonCount > commaCount) return ';';
    return ',';
  }, []);

  // Parsear CSV
  const parseCSV = useCallback(async (csvContent: string): Promise<ImportStudentRow[]> => {
    await fetchClasses();
    
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];
    
    const delimiter = detectDelimiter(lines[0]);
    const rows: ImportStudentRow[] = [];
    
    // Detectar se tem header
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('email') || firstLine.includes('name');
    const startIndex = hasHeader ? 1 : 0;
    
    // Mapear colunas do header (se existir)
    let columnMap: Record<string, number> = {
      nome: 0,
      email: 1,
      turma: 2,
      data_nasc: 3,
      telefone: 4,
      matricula: 5,
      cpf: 6,
      responsavel_nome: 7,
      responsavel_telefone: 8,
      senha: 9
    };
    
    if (hasHeader) {
      const headers = lines[0].split(delimiter).map(h => 
        h.trim().toLowerCase()
          .replace(/['"]/g, '')
          .replace(/data de nascimento|nascimento|dob/g, 'data_nasc')
          .replace(/phone|celular/g, 'telefone')
          .replace(/enrollment|matrícula/g, 'matricula')
          .replace(/document|documento/g, 'cpf')
          .replace(/guardian|responsável/g, 'responsavel_nome')
          .replace(/password|senha/g, 'senha')
          .replace(/class|turma/g, 'turma')
          .replace(/name|nome/g, 'nome')
      );
      
      columnMap = {};
      headers.forEach((h, i) => {
        if (h.includes('nome') && !h.includes('responsavel')) columnMap.nome = i;
        else if (h.includes('email')) columnMap.email = i;
        else if (h.includes('turma')) columnMap.turma = i;
        else if (h.includes('data_nasc') || h.includes('nasc')) columnMap.data_nasc = i;
        else if (h.includes('telefone') || h.includes('phone')) columnMap.telefone = i;
        else if (h.includes('matricula')) columnMap.matricula = i;
        else if (h.includes('cpf')) columnMap.cpf = i;
        else if (h.includes('responsavel_nome')) columnMap.responsavel_nome = i;
        else if (h.includes('responsavel_telefone')) columnMap.responsavel_telefone = i;
        else if (h.includes('senha')) columnMap.senha = i;
      });
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      const nome = cols[columnMap.nome ?? 0] || '';
      const email = cols[columnMap.email ?? 1] || '';
      const turma = cols[columnMap.turma ?? 2] || '';
      const data_nasc = cols[columnMap.data_nasc ?? -1] || '';
      const telefone = cols[columnMap.telefone ?? -1] || '';
      const matricula = cols[columnMap.matricula ?? -1] || '';
      const cpf = cols[columnMap.cpf ?? -1] || '';
      const responsavel_nome = cols[columnMap.responsavel_nome ?? -1] || '';
      const responsavel_telefone = cols[columnMap.responsavel_telefone ?? -1] || '';
      const senha = cols[columnMap.senha ?? -1] || '';
      
      const errors: string[] = [];
      
      // Validações
      if (!nome || nome.length < 3) {
        errors.push('Nome é obrigatório (mínimo 3 caracteres)');
      }
      
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email inválido');
      }
      
      if (cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cpf)) {
        errors.push('CPF inválido');
      }
      
      if (data_nasc && isNaN(Date.parse(data_nasc))) {
        errors.push('Data de nascimento inválida');
      }
      
      // Gerar email e senha se não fornecidos
      const generatedEmail = !email ? generateEmail(nome) : undefined;
      const generatedPassword = !senha ? generatePassword(nome) : undefined;
      
      rows.push({
        rowNumber: i - startIndex + 1,
        nome,
        email: email || generatedEmail || '',
        turma,
        data_nasc,
        telefone,
        matricula,
        cpf,
        responsavel_nome,
        responsavel_telefone,
        senha: senha || generatedPassword || '',
        isValid: errors.length === 0 && nome.length >= 3,
        errors,
        generatedEmail,
        generatedPassword
      });
    }
    
    setParsedRows(rows);
    return rows;
  }, [fetchClasses, detectDelimiter, generateEmail, generatePassword]);

  // Validar limites e duplicatas
  const validateImport = useCallback(async (rows: ImportStudentRow[]): Promise<{
    canProceed: boolean;
    limitError?: string;
    duplicates: { email: string[]; cpf: string[]; matricula: string[] };
  }> => {
    if (!currentSchool) {
      return { canProceed: false, limitError: 'Escola não selecionada', duplicates: { email: [], cpf: [], matricula: [] } };
    }
    
    const validRows = rows.filter(r => r.isValid);
    
    // Verificar limite de assinatura
    const validation = await validateStudentCreation(currentSchool.id);
    if (!validation.can_create) {
      const studentsRemaining = (validation.max_students || 0) - (validation.current_students || 0);
      return {
        canProceed: false,
        limitError: `${validation.message}. Tentando adicionar ${validRows.length} alunos, mas só há espaço para ${Math.max(0, studentsRemaining)}.`,
        duplicates: { email: [], cpf: [], matricula: [] }
      };
    }
    
    // Verificar se quantidade a importar excede limite restante
    const studentsRemaining = (validation.max_students || 0) - (validation.current_students || 0);
    if (validRows.length > studentsRemaining && studentsRemaining >= 0) {
      return {
        canProceed: false,
        limitError: `Limite de alunos será excedido. Tentando adicionar ${validRows.length} alunos, mas só há espaço para ${studentsRemaining}.`,
        duplicates: { email: [], cpf: [], matricula: [] }
      };
    }
    
    // Buscar dados existentes para detectar duplicatas
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('email, enrollment_number, student_notes')
      .eq('current_school_id', currentSchool.id);
    
    const existingEmails = new Set((existingProfiles || []).map(p => p.email?.toLowerCase()));
    const existingMatriculas = new Set((existingProfiles || []).map(p => p.enrollment_number?.toLowerCase()).filter(Boolean));
    const existingCPFs = new Set<string>();
    
    (existingProfiles || []).forEach(p => {
      if (p.student_notes) {
        try {
          const notes = typeof p.student_notes === 'string' ? JSON.parse(p.student_notes) : p.student_notes;
          if (notes?.document) existingCPFs.add(notes.document.replace(/\D/g, ''));
        } catch {}
      }
    });
    
    const duplicateEmails: string[] = [];
    const duplicateCPFs: string[] = [];
    const duplicateMatriculas: string[] = [];
    
    rows.forEach(row => {
      if (row.email && existingEmails.has(row.email.toLowerCase())) {
        duplicateEmails.push(row.email);
      }
      if (row.matricula && existingMatriculas.has(row.matricula.toLowerCase())) {
        duplicateMatriculas.push(row.matricula);
      }
      if (row.cpf) {
        const cleanCPF = row.cpf.replace(/\D/g, '');
        if (existingCPFs.has(cleanCPF)) {
          duplicateCPFs.push(row.cpf);
        }
      }
    });
    
    return {
      canProceed: duplicateEmails.length === 0 && duplicateCPFs.length === 0,
      duplicates: {
        email: duplicateEmails,
        cpf: duplicateCPFs,
        matricula: duplicateMatriculas
      }
    };
  }, [currentSchool?.id, validateStudentCreation]);

  // Processar importação
  const processImport = useCallback(async (rows: ImportStudentRow[]): Promise<ImportSummary> => {
    if (!currentSchool) {
      throw new Error('Escola não selecionada');
    }
    
    setIsLoading(true);
    setProgress(0);
    setCurrentRow(0);
    
    const validRows = rows.filter(r => r.isValid);
    const results: ImportResult[] = [];
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setCurrentRow(i + 1);
        setProgress(Math.round(((i + 1) / validRows.length) * 100));
        
        try {
          // Preparar student_notes
          const studentNotes: any = {};
          if (row.cpf) studentNotes.document = row.cpf.replace(/\D/g, '');
          
          // Chamar Edge Function
          const response = await fetch(
            'https://yanspolqarficibgovia.supabase.co/functions/v1/create-demo-user',
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM'
              },
              body: JSON.stringify({
                email: row.email,
                password: row.senha,
                name: row.nome,
                role: 'aluno',
                dob: row.data_nasc || null,
                phone: row.telefone || null,
                enrollment_number: row.matricula || null,
                student_notes: Object.keys(studentNotes).length > 0 ? JSON.stringify(studentNotes) : null,
                school_id: currentSchool.id
              })
            }
          );
          
          const responseData = await response.json();
          
          if (!response.ok || !responseData.success) {
            results.push({
              success: false,
              email: row.email,
              password: row.senha,
              name: row.nome,
              error: responseData.error || 'Erro desconhecido'
            });
            continue;
          }
          
          const studentId = responseData.user?.id;
          
          // Vincular à turma se especificada
          if (row.turma && studentId) {
            const classMatch = availableClasses.find(c => 
              c.code?.toLowerCase() === row.turma?.toLowerCase() ||
              c.name?.toLowerCase() === row.turma?.toLowerCase()
            );
            
            if (classMatch) {
              await supabase
                .from('class_students')
                .upsert({
                  student_id: studentId,
                  class_id: classMatch.id
                }, { onConflict: 'student_id,class_id' });
            }
          }
          
          // Criar responsável se fornecido
          if (row.responsavel_nome && studentId) {
            await supabase
              .from('guardians')
              .insert({
                student_id: studentId,
                name: row.responsavel_nome,
                phone: row.responsavel_telefone || null,
                relation: 'Responsável',
                is_primary: true
              });
          }
          
          results.push({
            success: true,
            studentId,
            email: row.email,
            password: row.senha,
            name: row.nome
          });
          
        } catch (err) {
          results.push({
            success: false,
            email: row.email,
            password: row.senha,
            name: row.nome,
            error: err instanceof Error ? err.message : 'Erro desconhecido'
          });
        }
      }
      
      const summary: ImportSummary = {
        total: validRows.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
      
      setImportSummary(summary);
      return summary;
      
    } finally {
      setIsLoading(false);
    }
  }, [currentSchool?.id, availableClasses]);

  // Gerar CSV de credenciais
  const generateCredentialsCSV = useCallback((results: ImportResult[]): string => {
    const successResults = results.filter(r => r.success);
    const lines = ['Nome;Email;Senha'];
    
    successResults.forEach(r => {
      lines.push(`${r.name};${r.email};${r.password}`);
    });
    
    return lines.join('\n');
  }, []);

  // Download CSV
  const downloadCredentials = useCallback((results: ImportResult[]) => {
    const csv = generateCredentialsCSV(results);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `credenciais_alunos_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generateCredentialsCSV]);

  // Gerar template CSV
  const downloadTemplate = useCallback(() => {
    const template = `nome;email;turma;data_nasc;telefone;matricula;cpf;responsavel_nome;responsavel_telefone;senha
João Silva;joao@exemplo.com;7A-2025;2010-05-15;11999999999;2025001;123.456.789-00;Maria Silva;11988888888;
Maria Santos;;8B-2025;2009-03-20;;;;;;;
Pedro Oliveira;pedro@exemplo.com;7A-2025;;;2025003;;;;SenhaForte123!`;
    
    const blob = new Blob(['\ufeff' + template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_importacao_alunos.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setParsedRows([]);
    setImportSummary(null);
    setProgress(0);
    setCurrentRow(0);
    setIsLoading(false);
  }, []);

  return {
    // State
    isLoading,
    progress,
    currentRow,
    parsedRows,
    importSummary,
    availableClasses,
    
    // Actions
    parseCSV,
    validateImport,
    processImport,
    downloadCredentials,
    downloadTemplate,
    reset
  };
}
