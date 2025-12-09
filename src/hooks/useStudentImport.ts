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
  responsavel_email?: string;
  senha?: string;
  // Calculated fields
  isValid: boolean;
  errors: string[];
  generatedPassword?: string;
  generatedEmail?: string;
  calculatedAge?: number | null;
  isMinor?: boolean;
  loginEmail?: string; // Email que será usado para login (próprio ou do responsável)
}

export interface ImportResult {
  success: boolean;
  studentId?: string;
  email: string;
  password: string;
  name: string;
  error?: string;
  emailSent?: boolean;
  emailError?: string;
  isMinor?: boolean;
  guardianEmail?: string;
}

export interface ImportSummary {
  total: number;
  succeeded: number;
  failed: number;
  emailsSent: number;
  emailsFailed: number;
  results: ImportResult[];
}

interface ClassInfo {
  id: string;
  code: string;
  name: string;
}

// Calcular idade a partir da data de nascimento
const calculateAge = (dob: string): number | null => {
  if (!dob) return null;
  
  // Tentar diferentes formatos de data
  let birthDate: Date;
  
  // Formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
    const [day, month, year] = dob.split('/');
    birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  // Formato YYYY-MM-DD
  else if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    birthDate = new Date(dob);
  }
  // Formato DD-MM-YYYY
  else if (/^\d{2}-\d{2}-\d{4}$/.test(dob)) {
    const [day, month, year] = dob.split('-');
    birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  else {
    birthDate = new Date(dob);
  }
  
  if (isNaN(birthDate.getTime())) return null;
  
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export function useStudentImport() {
  const { currentSchool } = useSchool();
  const { validateStudentCreation } = useSubscription();
  
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentRow, setCurrentRow] = useState(0);
  const [parsedRows, setParsedRows] = useState<ImportStudentRow[]>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([]);
  const [sendEmails, setSendEmails] = useState(true);

  // Gerar email automático baseado no nome
  const generateEmail = useCallback((name: string, schoolSlug?: string): string => {
    const cleanName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z\s]/g, '')
      .trim();
    
    const parts = cleanName.split(/\s+/);
    const firstName = parts[0] || 'aluno';
    const lastName = parts[parts.length - 1] || '';
    const slug = schoolSlug || currentSchool?.slug || 'escola';
    
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

  // Parsear CSV com validação por idade
  const parseCSV = useCallback(async (csvContent: string): Promise<ImportStudentRow[]> => {
    await fetchClasses();
    
    const lines = csvContent.trim().split('\n');
    if (lines.length === 0) return [];
    
    const delimiter = detectDelimiter(lines[0]);
    const rows: ImportStudentRow[] = [];
    
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('nome') || firstLine.includes('email') || firstLine.includes('name');
    const startIndex = hasHeader ? 1 : 0;
    
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
      responsavel_email: 9,
      senha: 10
    };
    
    if (hasHeader) {
      const headers = lines[0].split(delimiter).map(h => 
        h.trim().toLowerCase()
          .replace(/['"]/g, '')
          .replace(/data de nascimento|nascimento|dob/g, 'data_nasc')
          .replace(/phone|celular/g, 'telefone')
          .replace(/enrollment|matrícula/g, 'matricula')
          .replace(/document|documento/g, 'cpf')
          .replace(/guardian_name|responsável_nome/g, 'responsavel_nome')
          .replace(/guardian_phone|responsável_telefone/g, 'responsavel_telefone')
          .replace(/guardian_email|responsável_email|email_responsavel/g, 'responsavel_email')
          .replace(/password|senha/g, 'senha')
          .replace(/class|turma/g, 'turma')
          .replace(/name|nome/g, 'nome')
      );
      
      columnMap = {};
      headers.forEach((h, i) => {
        if (h.includes('responsavel_nome') || h.includes('guardian_name')) columnMap.responsavel_nome = i;
        else if (h.includes('responsavel_telefone') || h.includes('guardian_phone')) columnMap.responsavel_telefone = i;
        else if (h.includes('responsavel_email') || h.includes('guardian_email') || h.includes('email_responsavel')) columnMap.responsavel_email = i;
        else if (h.includes('nome') && !h.includes('responsavel')) columnMap.nome = i;
        else if (h.includes('email') && !h.includes('responsavel')) columnMap.email = i;
        else if (h.includes('turma')) columnMap.turma = i;
        else if (h.includes('data_nasc') || h.includes('nasc')) columnMap.data_nasc = i;
        else if (h.includes('telefone') || h.includes('phone')) columnMap.telefone = i;
        else if (h.includes('matricula')) columnMap.matricula = i;
        else if (h.includes('cpf')) columnMap.cpf = i;
        else if (h.includes('senha')) columnMap.senha = i;
      });
    }
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
      
      const nome = cols[columnMap.nome ?? 0] || '';
      const email = cols[columnMap.email ?? -1] || '';
      const turma = cols[columnMap.turma ?? -1] || '';
      const data_nasc = cols[columnMap.data_nasc ?? -1] || '';
      const telefone = cols[columnMap.telefone ?? -1] || '';
      const matricula = cols[columnMap.matricula ?? -1] || '';
      const cpf = cols[columnMap.cpf ?? -1] || '';
      const responsavel_nome = cols[columnMap.responsavel_nome ?? -1] || '';
      const responsavel_telefone = cols[columnMap.responsavel_telefone ?? -1] || '';
      const responsavel_email = cols[columnMap.responsavel_email ?? -1] || '';
      const senha = cols[columnMap.senha ?? -1] || '';
      
      const errors: string[] = [];
      
      // Calcular idade
      const calculatedAge = calculateAge(data_nasc);
      const isMinor = calculatedAge !== null && calculatedAge < 18;
      
      // Validações básicas
      if (!nome || nome.length < 3) {
        errors.push('Nome é obrigatório (mínimo 3 caracteres)');
      }
      
      // Validação condicional por idade
      if (calculatedAge !== null) {
        if (calculatedAge >= 18) {
          // Maior de idade: email próprio obrigatório
          if (!email) {
            errors.push('Email obrigatório para maiores de idade');
          }
        } else {
          // Menor de idade: responsável + email do responsável obrigatórios
          if (!responsavel_nome) {
            errors.push('Nome do responsável obrigatório para menores');
          }
          if (!responsavel_email) {
            errors.push('Email do responsável obrigatório para menores');
          }
        }
      }
      
      // Validação de formato de email
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Email do aluno inválido');
      }
      
      if (responsavel_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(responsavel_email)) {
        errors.push('Email do responsável inválido');
      }
      
      if (cpf && !/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(cpf)) {
        errors.push('CPF inválido');
      }
      
      if (data_nasc && calculatedAge === null) {
        errors.push('Data de nascimento inválida');
      }
      
      // Determinar email de login
      let loginEmail: string;
      if (isMinor && responsavel_email) {
        // Menor usa email do responsável
        loginEmail = responsavel_email;
      } else if (email) {
        // Usa email próprio se fornecido
        loginEmail = email;
      } else {
        // Gera email automático (fallback)
        loginEmail = generateEmail(nome);
      }
      
      const generatedEmail = !email && !isMinor ? generateEmail(nome) : undefined;
      const generatedPassword = !senha ? generatePassword(nome) : undefined;
      
      rows.push({
        rowNumber: i - startIndex + 1,
        nome,
        email: loginEmail,
        turma,
        data_nasc,
        telefone,
        matricula,
        cpf,
        responsavel_nome,
        responsavel_telefone,
        responsavel_email,
        senha: senha || generatedPassword || '',
        isValid: errors.length === 0 && nome.length >= 3,
        errors,
        generatedEmail: generatedEmail || (isMinor ? undefined : (!email ? loginEmail : undefined)),
        generatedPassword,
        calculatedAge,
        isMinor,
        loginEmail
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
    
    const validation = await validateStudentCreation(currentSchool.id);
    if (!validation.can_create) {
      const studentsRemaining = (validation.max_students || 0) - (validation.current_students || 0);
      return {
        canProceed: false,
        limitError: `${validation.message}. Tentando adicionar ${validRows.length} alunos, mas só há espaço para ${Math.max(0, studentsRemaining)}.`,
        duplicates: { email: [], cpf: [], matricula: [] }
      };
    }
    
    const studentsRemaining = (validation.max_students || 0) - (validation.current_students || 0);
    if (validRows.length > studentsRemaining && studentsRemaining >= 0) {
      return {
        canProceed: false,
        limitError: `Limite de alunos será excedido. Tentando adicionar ${validRows.length} alunos, mas só há espaço para ${studentsRemaining}.`,
        duplicates: { email: [], cpf: [], matricula: [] }
      };
    }
    
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

  // Enviar email de credenciais
  const sendCredentialsEmail = useCallback(async (
    to: string,
    studentName: string,
    email: string,
    password: string,
    isGuardian: boolean = false,
    guardianName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        'https://yanspolqarficibgovia.supabase.co/functions/v1/send-credentials-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhbnNwb2xxYXJmaWNpYmdvdmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTczMjUsImV4cCI6MjA3NDQzMzMyNX0.QMU9Bxjl9NzyrSgUKeHE0HgcSsBUeFQefjQIoEczRYM'
          },
          body: JSON.stringify({
            to,
            studentName,
            email,
            password,
            schoolName: currentSchool?.name || 'Klase',
            isGuardian,
            guardianName
          })
        }
      );
      
      const data = await response.json();
      return { success: data.success, error: data.error };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro ao enviar email' };
    }
  }, [currentSchool?.name]);

  // Processar importação
  const processImport = useCallback(async (rows: ImportStudentRow[], shouldSendEmails: boolean = true): Promise<ImportSummary> => {
    if (!currentSchool) {
      throw new Error('Escola não selecionada');
    }
    
    setIsLoading(true);
    setProgress(0);
    setCurrentRow(0);
    
    const validRows = rows.filter(r => r.isValid);
    const results: ImportResult[] = [];
    let emailsSent = 0;
    let emailsFailed = 0;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');
      
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setCurrentRow(i + 1);
        setProgress(Math.round(((i + 1) / validRows.length) * 100));
        
        try {
          const studentNotes: any = {};
          if (row.cpf) studentNotes.document = row.cpf.replace(/\D/g, '');
          
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
              error: responseData.error || 'Erro desconhecido',
              isMinor: row.isMinor,
              guardianEmail: row.responsavel_email
            });
            continue;
          }
          
          const studentId = responseData.user?.id;
          
          // Vincular à turma
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
          
          // Criar responsável
          if (row.responsavel_nome && studentId) {
            await supabase
              .from('guardians')
              .insert({
                student_id: studentId,
                name: row.responsavel_nome,
                phone: row.responsavel_telefone || null,
                email: row.responsavel_email || null,
                relation: 'Responsável',
                is_primary: true
              });
          }
          
          // Enviar email de credenciais
          let emailSent = false;
          let emailError: string | undefined;
          
          if (shouldSendEmails) {
            const emailTo = row.isMinor ? row.responsavel_email : row.email;
            if (emailTo) {
              const emailResult = await sendCredentialsEmail(
                emailTo,
                row.nome,
                row.email,
                row.senha,
                row.isMinor || false,
                row.responsavel_nome
              );
              
              emailSent = emailResult.success;
              emailError = emailResult.error;
              
              if (emailSent) {
                emailsSent++;
              } else {
                emailsFailed++;
              }
            }
          }
          
          results.push({
            success: true,
            studentId,
            email: row.email,
            password: row.senha,
            name: row.nome,
            emailSent,
            emailError,
            isMinor: row.isMinor,
            guardianEmail: row.responsavel_email
          });
          
        } catch (err) {
          results.push({
            success: false,
            email: row.email,
            password: row.senha,
            name: row.nome,
            error: err instanceof Error ? err.message : 'Erro desconhecido',
            isMinor: row.isMinor,
            guardianEmail: row.responsavel_email
          });
        }
      }
      
      const summary: ImportSummary = {
        total: validRows.length,
        succeeded: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        emailsSent,
        emailsFailed,
        results
      };
      
      setImportSummary(summary);
      return summary;
      
    } finally {
      setIsLoading(false);
    }
  }, [currentSchool?.id, availableClasses, sendCredentialsEmail]);

  // Gerar CSV de credenciais
  const generateCredentialsCSV = useCallback((results: ImportResult[]): string => {
    const successResults = results.filter(r => r.success);
    const lines = ['Nome;Email de Login;Senha;Tipo;Email Responsável'];
    
    successResults.forEach(r => {
      const tipo = r.isMinor ? 'Menor' : 'Maior';
      const guardianEmail = r.guardianEmail || '';
      lines.push(`${r.name};${r.email};${r.password};${tipo};${guardianEmail}`);
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

  // Gerar template CSV atualizado com exemplos claros
  const downloadTemplate = useCallback(() => {
    // Template com 3 exemplos representativos:
    // 1. Adulto (22 anos) com dados completos - email próprio para login
    // 2. Menor (9 anos) com responsável - email do responsável para login  
    // 3. Adulto (18 anos) com dados mínimos - apenas obrigatórios
    const template = `nome;email;turma;data_nasc;telefone;matricula;cpf;responsavel_nome;responsavel_telefone;responsavel_email;senha
Pedro Oliveira;pedro@email.com;9A-2025;2002-03-15;11999887766;2025001;123.456.789-00;;;;SenhaForte123!
Mariana Santos;;3B-2025;2015-08-22;11988776655;2025002;;Maria Santos;11977665544;maria.mae@email.com;
Ana Costa;ana.costa@email.com;1A-2025;2007-01-10;;2025003;;;;;;`;
    
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
    sendEmails,
    setSendEmails,
    // Actions
    parseCSV,
    validateImport,
    processImport,
    downloadCredentials,
    downloadTemplate,
    reset
  };
}
