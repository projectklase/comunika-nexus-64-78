import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseStudentNotes } from '@/utils/student-notes-helpers';
import { normalizePhoneForComparison } from '@/lib/phone-utils';

export interface Address {
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface Guardian {
  id?: string;
  name: string;
  relation: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

interface ExistingUser {
  id: string;
  name: string;
  email: string;
  dob?: string;
  enrollmentNumber?: string;
  guardians?: Guardian[];
}

interface BlockingIssue {
  field: 'cpf' | 'enrollment_number' | 'email' | 'phone';
  message: string;
  existingUser: ExistingUser;
}

interface Similarity {
  type: 'name' | 'name_dob' | 'phone' | 'address';
  severity: 'low' | 'medium' | 'high';
  message: string;
  existingUsers: ExistingUser[];
}

export interface DuplicateCheckResult {
  hasBlocking: boolean;
  blockingIssues: BlockingIssue[];
  hasSimilarities: boolean;
  similarities: Similarity[];
}

interface CheckData {
  cpf?: string;
  enrollmentNumber?: string;
  name?: string;
  dob?: string;
  phone?: string;
  address?: Address;
  email?: string;
}

export function useDuplicateCheck(currentSchoolId: string | null) {
  const [isChecking, setIsChecking] = useState(false);

  const checkDuplicates = async (
    data: CheckData,
    excludeUserId?: string
  ): Promise<DuplicateCheckResult> => {
    setIsChecking(true);

    const result: DuplicateCheckResult = {
      hasBlocking: false,
      blockingIssues: [],
      hasSimilarities: false,
      similarities: [],
    };

    if (!currentSchoolId) {
      setIsChecking(false);
      return result;
    }

    try {
      // 1. VERIFICAR CPF DUPLICADO (BLOQUEANTE)
      if (data.cpf) {
        const cleanCpf = data.cpf.replace(/\D/g, '');
        
        const { data: profilesWithCpf, error: cpfError } = await supabase
          .from('profiles')
          .select('id, name, email, student_notes, enrollment_number')
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (cpfError) {
          console.error('Erro ao verificar CPF:', cpfError);
        } else if (profilesWithCpf) {
          // Filtrar manualmente por CPF no student_notes
          const cpfDuplicates = profilesWithCpf.filter(p => {
            const notes = parseStudentNotes(p.student_notes);
            const documentFromDb = notes?.document?.replace(/\D/g, ''); // Normalizar formatação
            return documentFromDb === cleanCpf;
          });

          if (cpfDuplicates.length > 0) {
            cpfDuplicates.forEach(user => {
              result.blockingIssues.push({
                field: 'cpf',
                message: `CPF já cadastrado`,
                existingUser: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  enrollmentNumber: user.enrollment_number || undefined,
                },
              });
            });
            result.hasBlocking = true;
          }
        }
      }

      // 2. VERIFICAR MATRÍCULA DUPLICADA (BLOQUEANTE)
      if (data.enrollmentNumber) {
        const { data: enrollmentDuplicates, error: enrollmentError } = await supabase
          .from('profiles')
          .select('id, name, email, enrollment_number')
          .eq('enrollment_number', data.enrollmentNumber)
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (enrollmentError) {
          console.error('Erro ao verificar matrícula:', enrollmentError);
        } else if (enrollmentDuplicates && enrollmentDuplicates.length > 0) {
          enrollmentDuplicates.forEach(user => {
            result.blockingIssues.push({
              field: 'enrollment_number',
              message: `Matrícula já cadastrada`,
              existingUser: {
                id: user.id,
                name: user.name,
                email: user.email,
                enrollmentNumber: user.enrollment_number || undefined,
              },
            });
          });
          result.hasBlocking = true;
        }
      }

      // 3. VERIFICAR NOME IDÊNTICO (ALERTA)
      if (data.name) {
        const { data: nameDuplicates, error: nameError } = await supabase
          .from('profiles')
          .select('id, name, email, dob, enrollment_number')
          .ilike('name', data.name)
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (nameError) {
          console.error('Erro ao verificar nome:', nameError);
        } else if (nameDuplicates && nameDuplicates.length > 0) {
          // 4. VERIFICAR NOME + DOB (ALERTA ALTO)
          if (data.dob) {
            const nameAndDobMatches = nameDuplicates.filter(u => u.dob === data.dob);
            
            if (nameAndDobMatches.length > 0) {
              result.similarities.push({
                type: 'name_dob',
                severity: 'high',
                message: `Encontramos ${nameAndDobMatches.length} aluno(s) com nome e data de nascimento idênticos`,
                existingUsers: nameAndDobMatches.map(u => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  dob: u.dob || undefined,
                  enrollmentNumber: u.enrollment_number || undefined,
                })),
              });
              result.hasSimilarities = true;
            }
          }

          // Alertar sobre nomes similares (que não bateram em DOB)
          const nameOnlyMatches = data.dob 
            ? nameDuplicates.filter(u => u.dob !== data.dob)
            : nameDuplicates;

          if (nameOnlyMatches.length > 0) {
            result.similarities.push({
              type: 'name',
              severity: 'low',
              message: `Encontramos ${nameOnlyMatches.length} aluno(s) com nome similar`,
              existingUsers: nameOnlyMatches.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                dob: u.dob || undefined,
                enrollmentNumber: u.enrollment_number || undefined,
              })),
            });
            result.hasSimilarities = true;
          }
        }
      }

      // 5. VERIFICAR TELEFONE PRINCIPAL (ALERTA MÉDIO + BUSCAR GUARDIANS)
      if (data.phone) {
        const cleanPhone = normalizePhoneForComparison(data.phone);
        
        // ✅ BUSCAR TODOS OS PROFILES DA ESCOLA (não filtrar por phone)
        const { data: allProfiles, error: phoneError } = await supabase
          .from('profiles')
          .select('id, name, email, phone')
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (phoneError) {
          console.error('Erro ao verificar telefone:', phoneError);
        } else if (allProfiles) {
          // ✅ FILTRAR MANUALMENTE NORMALIZANDO AMBOS OS LADOS
          const phoneDuplicates = allProfiles.filter(p => {
            const dbPhone = normalizePhoneForComparison(p.phone);
            return dbPhone === cleanPhone && dbPhone.length > 0;
          });

          if (phoneDuplicates.length > 0) {
            // Buscar guardians dos alunos similares
            const { data: guardiansData } = await supabase
              .from('guardians')
              .select('*')
              .in('student_id', phoneDuplicates.map(u => u.id));

            const usersWithGuardians = phoneDuplicates.map(u => {
              const userGuardians = guardiansData?.filter(g => g.student_id === u.id) || [];
              return {
                id: u.id,
                name: u.name,
                email: u.email,
                guardians: userGuardians.map(g => ({
                  id: g.id,
                  name: g.name,
                  relation: g.relation,
                  phone: g.phone || undefined,
                  email: g.email || undefined,
                  isPrimary: g.is_primary || false,
                })),
              };
            });

            result.similarities.push({
              type: 'phone',
              severity: 'medium',
              message: `Encontramos ${phoneDuplicates.length} aluno(s) com o mesmo telefone`,
              existingUsers: usersWithGuardians,
            });
            result.hasSimilarities = true;
          }
        }
      }

      // 6. VERIFICAR ENDEREÇO COMPLETO (ALERTA MÉDIO + BUSCAR GUARDIANS)
      if (data.address?.street && data.address?.number && data.address?.city) {
        const { data: allProfiles, error: addressError } = await supabase
          .from('profiles')
          .select('id, name, email, student_notes')
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (addressError) {
          console.error('Erro ao verificar endereço:', addressError);
        } else if (allProfiles) {
          // Filtrar manualmente por endereço no student_notes
          const addressDuplicates = allProfiles.filter(p => {
            const notes = parseStudentNotes(p.student_notes);
            const addr = notes?.additionalInfo ? JSON.parse(notes.additionalInfo) : null;
            const address = addr?.address as Address | undefined;
            return (
              address?.street?.toLowerCase() === data.address?.street?.toLowerCase() &&
              address?.number === data.address?.number &&
              address?.city?.toLowerCase() === data.address?.city?.toLowerCase()
            );
          });

          if (addressDuplicates.length > 0) {
            // Buscar guardians dos alunos similares
            const { data: guardiansData } = await supabase
              .from('guardians')
              .select('*')
              .in('student_id', addressDuplicates.map(u => u.id));

            const usersWithGuardians = addressDuplicates.map(u => {
              const userGuardians = guardiansData?.filter(g => g.student_id === u.id) || [];
              return {
                id: u.id,
                name: u.name,
                email: u.email,
                guardians: userGuardians.map(g => ({
                  id: g.id,
                  name: g.name,
                  relation: g.relation,
                  phone: g.phone || undefined,
                  email: g.email || undefined,
                  isPrimary: g.is_primary || false,
                })),
              };
            });

            result.similarities.push({
              type: 'address',
              severity: 'medium',
              message: `Encontramos ${addressDuplicates.length} aluno(s) com o mesmo endereço`,
              existingUsers: usersWithGuardians,
            });
            result.hasSimilarities = true;
          }
        }
      }

      // 7. VERIFICAR EMAIL DUPLICADO - BLOQUEANTE
      if (data.email) {
        const { data: emailDuplicates, error: emailError } = await supabase
          .from('profiles')
          .select('id, name, email, dob')
          .eq('email', data.email)
          .eq('current_school_id', currentSchoolId)
          .neq('id', excludeUserId || '00000000-0000-0000-0000-000000000000');

        if (emailError) {
          console.error('Erro ao verificar email:', emailError);
        } else if (emailDuplicates && emailDuplicates.length > 0) {
          result.blockingIssues.push({
            field: 'email',
            message: '🚫 Email já cadastrado',
            existingUser: {
              id: emailDuplicates[0].id,
              name: emailDuplicates[0].name,
              email: emailDuplicates[0].email,
              dob: emailDuplicates[0].dob || undefined,
            },
          });
          result.hasBlocking = true;
        }
      }
    } catch (error) {
      console.error('Erro ao verificar duplicatas:', error);
    } finally {
      setIsChecking(false);
    }

    return result;
  };

  return { checkDuplicates, isChecking };
}
