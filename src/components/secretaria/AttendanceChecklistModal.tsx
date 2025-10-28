import { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, Download, Save, CheckSquare, Square, AlertCircle, Clock, Printer, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface AttendanceGuest {
  invitationId: string;
  guestName: string;
  guestAge: number;
  isMinor: boolean;
  parentName: string | null;
  parentContact: string | null;
  attended: boolean;
  checkedAt: string | null;
  hasChanges: boolean;
}

interface AttendanceStudent {
  studentId: string;
  studentName: string;
  studentAttended: boolean;
  checkedAt: string | null;
  guests: AttendanceGuest[];
  hasChanges: boolean;
  isExpanded: boolean;
}

interface AttendanceStats {
  totalStudents: number;
  totalGuests: number;
  studentsPresent: number;
  guestsPresent: number;
  totalPresent: number;
  totalAbsent: number;
  pendingChanges: number;
}

type FilterMode = 'ALL' | 'PRESENT' | 'ABSENT';

interface AttendanceChecklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

export function AttendanceChecklistModal({ 
  open, 
  onOpenChange, 
  eventId, 
  eventTitle 
}: AttendanceChecklistModalProps) {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados do evento
  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Buscar confirmações de alunos
      const { data: confirmations, error: confirmError } = await supabase
        .from('event_confirmations')
        .select('student_id')
        .eq('event_id', eventId);

      if (confirmError) throw confirmError;

      // Buscar profiles dos alunos
      const studentIds = confirmations?.map(c => c.student_id) || [];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Buscar convites de amigos
      const { data: invitations, error: invitError } = await supabase
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId);

      if (invitError) throw invitError;

      // Buscar presenças já registradas
      const { data: attendance, error: attError } = await supabase
        .from('event_attendance')
        .select('*')
        .eq('event_id', eventId);

      if (attError) throw attError;

      // Consolidar dados
      const studentsData: AttendanceStudent[] = (confirmations || []).map(conf => {
        const studentId = conf.student_id;
        const profile = profiles?.find(p => p.id === studentId);
        const studentName = profile?.name || 'Aluno';
        
        // Buscar presença do aluno
        const studentAttendance = attendance?.find(
          a => a.student_id === studentId && !a.guest_invitation_id
        );

        // Buscar convites deste aluno
        const studentInvitations = invitations?.filter(
          inv => inv.inviting_student_id === studentId
        ) || [];

        const guests: AttendanceGuest[] = studentInvitations.map(inv => {
          const guestAttendance = attendance?.find(
            a => a.guest_invitation_id === inv.id
          );

          const dob = new Date(inv.friend_dob);
          const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          const isMinor = age < 18;

          return {
            invitationId: inv.id,
            guestName: inv.friend_name,
            guestAge: age,
            isMinor,
            parentName: inv.parent_name || null,
            parentContact: inv.parent_contact || null,
            attended: guestAttendance?.attended || false,
            checkedAt: guestAttendance?.checked_at || null,
            hasChanges: false,
          };
        });

        return {
          studentId,
          studentName,
          studentAttended: studentAttendance?.attended || false,
          checkedAt: studentAttendance?.checked_at || null,
          guests,
          hasChanges: false,
          isExpanded: guests.length > 0,
        };
      });

      setStudents(studentsData);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && eventId) {
      loadData();
    }
  }, [open, eventId]);

  // Calcular estatísticas em tempo real
  const stats: AttendanceStats = useMemo(() => {
    const totalStudents = students.length;
    const totalGuests = students.reduce((sum, s) => sum + s.guests.length, 0);
    const studentsPresent = students.filter(s => s.studentAttended).length;
    const guestsPresent = students.reduce((sum, s) => 
      sum + s.guests.filter(g => g.attended).length, 0
    );
    
    const pendingChanges = students.reduce((count, s) => {
      if (s.hasChanges) count++;
      count += s.guests.filter(g => g.hasChanges).length;
      return count;
    }, 0);

    return {
      totalStudents,
      totalGuests,
      studentsPresent,
      guestsPresent,
      totalPresent: studentsPresent + guestsPresent,
      totalAbsent: (totalStudents + totalGuests) - (studentsPresent + guestsPresent),
      pendingChanges,
    };
  }, [students]);

  // Filtrar estudantes por busca e filtro
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Aplicar busca
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.studentName.toLowerCase().includes(term) ||
        student.guests.some(g => g.guestName.toLowerCase().includes(term))
      );
    }

    // Aplicar filtro de presença
    if (filterMode === 'PRESENT') {
      filtered = filtered.filter(s => s.studentAttended);
    } else if (filterMode === 'ABSENT') {
      filtered = filtered.filter(s => !s.studentAttended);
    }

    return filtered;
  }, [students, searchTerm, filterMode]);

  // Marcar/desmarcar presença de aluno
  const handleCheckStudent = (studentId: string, attended: boolean) => {
    setStudents(prev => prev.map(s => 
      s.studentId === studentId 
        ? { 
            ...s, 
            studentAttended: attended,
            checkedAt: attended ? new Date().toISOString() : null,
            hasChanges: true,
          }
        : s
    ));
  };

  // Marcar/desmarcar presença de convidado
  const handleCheckGuest = (studentId: string, invitationId: string, attended: boolean) => {
    setStudents(prev => prev.map(s => 
      s.studentId === studentId
        ? {
            ...s,
            guests: s.guests.map(g =>
              g.invitationId === invitationId
                ? {
                    ...g,
                    attended,
                    checkedAt: attended ? new Date().toISOString() : null,
                    hasChanges: true,
                  }
                : g
            ),
          }
        : s
    ));
  };

  // Marcar/desmarcar todos
  const handleToggleAll = () => {
    const allChecked = students.every(s => s.studentAttended && s.guests.every(g => g.attended));
    const newState = !allChecked;

    setStudents(prev => prev.map(s => ({
      ...s,
      studentAttended: newState,
      checkedAt: newState ? new Date().toISOString() : null,
      hasChanges: true,
      guests: s.guests.map(g => ({ 
        ...g, 
        attended: newState,
        checkedAt: newState ? new Date().toISOString() : null,
        hasChanges: true,
      })),
    })));
  };

  // Salvar presenças
  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Coletar apenas registros com mudanças
      const upsertData: any[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      for (const student of students) {
        if (student.hasChanges) {
          upsertData.push({
            event_id: eventId,
            student_id: student.studentId,
            guest_invitation_id: null,
            attended: student.studentAttended,
            checked_at: student.studentAttended ? new Date().toISOString() : null,
            checked_by: currentUserId,
          });
        }

        for (const guest of student.guests) {
          if (guest.hasChanges) {
            upsertData.push({
              event_id: eventId,
              student_id: student.studentId,
              guest_invitation_id: guest.invitationId,
              attended: guest.attended,
              checked_at: guest.attended ? new Date().toISOString() : null,
              checked_by: currentUserId,
            });
          }
        }
      }

      if (upsertData.length === 0) {
        toast({ 
          title: 'Nenhuma alteração para salvar',
          description: 'Não há mudanças pendentes',
        });
        return;
      }

      // Upsert em batch
      const { error: upsertError } = await supabase
        .from('event_attendance')
        .upsert(upsertData, {
          onConflict: 'event_id,student_id,guest_invitation_id'
        });

      if (upsertError) throw upsertError;

      // Reset tracking de mudanças
      setStudents(prev => prev.map(s => ({
        ...s,
        hasChanges: false,
        guests: s.guests.map(g => ({ ...g, hasChanges: false }))
      })));

      toast({
        title: '✅ Presenças salvas!',
        description: `${upsertData.length} registro(s) atualizado(s)`,
      });
    } catch (err: any) {
      console.error('Erro ao salvar:', err);
      toast({
        title: '❌ Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Exportar lista de chamada
  const exportAttendanceList = () => {
    if (students.length === 0) {
      toast({
        title: '⚠️ Lista vazia',
        description: 'Não há alunos confirmados para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Array para armazenar linhas de texto puro (melhor compatibilidade)
    const csvLines: string[] = [];
    
    // Header decorativo - todas as colunas devem ser definidas
    const separator = '═'.repeat(80);
    csvLines.push(`"${separator}","","","","",""`);
    csvLines.push(`"LISTA DE CHAMADA - EVENTO: ${eventTitle} | Data: ${format(new Date(), 'dd/MM/yyyy HH:mm')}","","","","",""`);
    csvLines.push(`"${separator}","","","","",""`);
    csvLines.push('","","","","","'); // Linha vazia
    
    // Cabeçalho da tabela
    csvLines.push('"Nº","Tipo","Nome","Idade","Observações","Presente"');
    
    let rowNumber = 1;
    
    // Lista de alunos e convidados
    for (const student of students) {
      // Linha do aluno
      const studentRow = [
        `"${String(rowNumber).padStart(2, '0')}"`,
        '"ALUNO"',
        `"${student.studentName.replace(/"/g, '""')}"`, // Escape de aspas duplas
        '"-"',
        `"${student.guests.length > 0 ? student.guests.length + ' convidado(s)' : '-'}"`,
        '"[ ]"'
      ].join(',');
      
      csvLines.push(studentRow);
      rowNumber++;
      
      // Linhas dos convidados (com indentação visual)
      for (const guest of student.guests) {
        const observations = guest.isMinor 
          ? `⚠️ MENOR - Resp: ${guest.parentName || 'Não informado'}`
          : '-';
        
        const guestRow = [
          `"${String(rowNumber).padStart(2, '0')}"`,
          '"CONVIDADO"',
          `"  └─ ${guest.guestName.replace(/"/g, '""')}"`, // Escape de aspas duplas
          `"${guest.guestAge} anos"`,
          `"${observations.replace(/"/g, '""')}"`, // Escape de aspas duplas
          '"[ ]"'
        ].join(',');
        
        csvLines.push(guestRow);
        rowNumber++;
      }
    }
    
    // Separador para resumo - manter estrutura de 6 colunas
    csvLines.push('"","","","","",""');
    csvLines.push(`"${separator}","","","","",""`);
    csvLines.push('"RESUMO DO EVENTO","","","","",""');
    csvLines.push(`"${separator}","","","","",""`);
    csvLines.push('"Métrica","Valor","","","",""');
    
    // Dados do resumo - manter estrutura de 6 colunas
    csvLines.push(`"TOTAL DE ALUNOS CONFIRMADOS","${stats.totalStudents}","","","",""`);
    csvLines.push(`"TOTAL DE CONVIDADOS","${stats.totalGuests}","","","",""`);
    csvLines.push(`"TOTAL DE PESSOAS","${stats.totalStudents + stats.totalGuests}","","","",""`);
    csvLines.push('"","","","","",""'); // Linha vazia (separador visual)
    csvLines.push(`"ALUNOS PRESENTES","${stats.studentsPresent}","","","",""`);
    csvLines.push(`"CONVIDADOS PRESENTES","${stats.guestsPresent}","","","",""`);
    csvLines.push(`"TOTAL PRESENTES","${stats.totalPresent}","","","",""`);
    csvLines.push(`"TOTAL AUSENTES","${stats.totalAbsent}","","","",""`);
    csvLines.push('"","","","","",""'); // Linha vazia (separador visual)
    
    const totalPeople = stats.totalStudents + stats.totalGuests;
    const attendanceRate = totalPeople > 0 ? ((stats.totalPresent / totalPeople) * 100).toFixed(1) : '0.0';
    csvLines.push(`"TAXA DE COMPARECIMENTO","${attendanceRate}%","","","",""`);
    
    // Juntar todas as linhas
    const csvContent = csvLines.join('\n');
    
    // Criar blob com BOM para UTF-8 (garante acentos no Excel)
    const blob = new Blob(['\uFEFF' + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    
    // Download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `lista_chamada_${eventTitle.replace(/\s+/g, '_')}_${Date.now()}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: '📥 Lista exportada!',
      description: `${rowNumber - 1} registros exportados com sucesso`,
    });
  };

  // Imprimir lista de chamada
  const handlePrint = () => {
    if (students.length === 0) {
      toast({
        title: '⚠️ Lista vazia',
        description: 'Não há alunos confirmados para imprimir',
        variant: 'destructive',
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: '⚠️ Popup bloqueado',
        description: 'Permita popups para imprimir a lista',
        variant: 'destructive',
      });
      return;
    }
    
    let rowNumber = 1;
    const tableRows = students.map(student => {
      let rows = `
        <tr>
          <td>${String(rowNumber++).padStart(2, '0')}</td>
          <td>ALUNO</td>
          <td><strong>${student.studentName}</strong></td>
          <td>-</td>
          <td>${student.guests.length > 0 ? student.guests.length + ' convidado(s)' : '-'}</td>
          <td class="checkbox">☐</td>
        </tr>
      `;
      
      student.guests.forEach(guest => {
        const observations = guest.isMinor 
          ? `<span class="minor">⚠️ MENOR - ${guest.parentName || 'Sem resp.'}</span>`
          : '-';
        
        rows += `
          <tr>
            <td>${String(rowNumber++).padStart(2, '0')}</td>
            <td>CONVIDADO</td>
            <td style="padding-left: 20px;">└─ ${guest.guestName}</td>
            <td>${guest.guestAge} anos</td>
            <td>${observations}</td>
            <td class="checkbox">☐</td>
          </tr>
        `;
      });
      
      return rows;
    }).join('');
    
    const totalPeople = stats.totalStudents + stats.totalGuests;
    const attendanceRate = totalPeople > 0 ? ((stats.totalPresent / totalPeople) * 100).toFixed(1) : '0.0';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lista de Chamada - ${eventTitle}</title>
        <style>
          @media print {
            @page { 
              margin: 1cm; 
              size: A4;
            }
            body { font-family: Arial, sans-serif; }
            .no-print { display: none; }
          }
          body { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            font-family: Arial, sans-serif;
          }
          h1 { 
            text-align: center; 
            border-bottom: 3px solid #000; 
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header { 
            margin-bottom: 20px; 
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
          }
          .header p { margin: 5px 0; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
          }
          th, td { 
            border: 1px solid #000; 
            padding: 8px; 
            text-align: left; 
            font-size: 12px;
          }
          th { 
            background-color: #333; 
            color: white;
            font-weight: bold;
          }
          .checkbox { 
            width: 40px; 
            text-align: center;
            font-size: 18px;
          }
          .minor { 
            color: #dc2626; 
            font-weight: bold; 
          }
          .summary { 
            margin-top: 30px; 
            border-top: 3px solid #000; 
            padding-top: 20px; 
          }
          .summary h2 {
            margin-bottom: 15px;
          }
          .summary-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 5px 0;
            border-bottom: 1px solid #ddd;
          }
          .summary-row:last-child {
            border-bottom: none;
          }
          .summary-row strong {
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>📝 Lista de Chamada</h1>
        <div class="header">
          <p><strong>Evento:</strong> ${eventTitle}</p>
          <p><strong>Data de Exportação:</strong> ${format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          <p><strong>Total de Pessoas:</strong> ${totalPeople}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">Nº</th>
              <th style="width: 100px;">Tipo</th>
              <th>Nome</th>
              <th style="width: 80px;">Idade</th>
              <th style="width: 200px;">Observações</th>
              <th class="checkbox">✓</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="summary">
          <h2>📊 Resumo do Evento</h2>
          <div class="summary-row">
            <span>Total de Alunos Confirmados:</span>
            <strong>${stats.totalStudents}</strong>
          </div>
          <div class="summary-row">
            <span>Total de Convidados:</span>
            <strong>${stats.totalGuests}</strong>
          </div>
          <div class="summary-row">
            <span>Total de Pessoas:</span>
            <strong>${totalPeople}</strong>
          </div>
          <hr style="margin: 15px 0;">
          <div class="summary-row">
            <span>Presentes (situação atual):</span>
            <strong style="color: #16a34a;">${stats.totalPresent}</strong>
          </div>
          <div class="summary-row">
            <span>Ausentes (situação atual):</span>
            <strong style="color: #dc2626;">${stats.totalAbsent}</strong>
          </div>
          <div class="summary-row">
            <span>Taxa de Comparecimento:</span>
            <strong>${attendanceRate}%</strong>
          </div>
        </div>
        
        <script>
          window.onload = () => {
            window.print();
          };
        </script>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 's':
            e.preventDefault();
            if (stats.pendingChanges > 0) {
              handleSave();
            }
            break;
          case 'f':
            e.preventDefault();
            searchInputRef.current?.focus();
            break;
          case 'a':
            e.preventDefault();
            handleToggleAll();
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [open, stats.pendingChanges]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">📝 Lista de Chamada - {eventTitle}</DialogTitle>
          <DialogDescription>
            Gerencie a presença de alunos e convidados no evento
          </DialogDescription>
        </DialogHeader>

        {/* Stats Dashboard */}
        <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {stats.totalStudents} alunos
          </Badge>
          <Badge variant="outline" className="gap-1">
            🎯 {stats.totalGuests} convidados
          </Badge>
          <Badge className="gap-1 bg-green-600 hover:bg-green-700">
            ✅ {stats.totalPresent} presentes
          </Badge>
          <Badge variant="destructive" className="gap-1">
            ❌ {stats.totalAbsent} ausentes
          </Badge>
          {stats.pendingChanges > 0 && (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {stats.pendingChanges} alterações pendentes
            </Badge>
          )}
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar aluno ou convidado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-base"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAll}
            className="gap-2"
          >
            {students.every(s => s.studentAttended) ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            Marcar Todos
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Button
            variant={filterMode === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('ALL')}
          >
            📌 Todos
          </Button>
          <Button
            variant={filterMode === 'PRESENT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('PRESENT')}
          >
            ✅ Presentes
          </Button>
          <Button
            variant={filterMode === 'ABSENT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMode('ABSENT')}
          >
            ❌ Ausentes
          </Button>
        </div>

        {/* Lista de Presença */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading && (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar dados</AlertTitle>
              <AlertDescription>
                {error}
                <Button onClick={loadData} variant="outline" size="sm" className="mt-2">
                  Tentar Novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && students.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum aluno confirmado ainda
              </h3>
              <p className="text-muted-foreground">
                Aguardando confirmações de presença para o evento
              </p>
            </div>
          )}

          {!isLoading && !error && filteredStudents.length > 0 && (
            <Accordion type="multiple" className="space-y-2" defaultValue={filteredStudents.filter(s => s.guests.length > 0).map(s => s.studentId)}>
              {filteredStudents.map(student => (
                <AccordionItem 
                  key={student.studentId} 
                  value={student.studentId}
                  className="border rounded-lg px-4 bg-card"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3 w-full" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={student.studentAttended}
                        onCheckedChange={(checked) => handleCheckStudent(student.studentId, checked as boolean)}
                      />
                      <span className="font-medium flex-1 text-left">{student.studentName}</span>
                      {student.guests.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          🎯 {student.guests.length} convidado{student.guests.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {student.studentAttended && student.checkedAt && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {format(new Date(student.checkedAt), 'HH:mm')}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>

                  {student.guests.length > 0 && (
                    <AccordionContent className="pb-3">
                      <div className="space-y-2 pl-8 pt-2">
                        {student.guests.map(guest => (
                          <div key={guest.invitationId} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                            <Checkbox
                              checked={guest.attended}
                              onCheckedChange={(checked) => handleCheckGuest(student.studentId, guest.invitationId, checked as boolean)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">└─ {guest.guestName}</span>
                                <Badge 
                                  variant={guest.isMinor ? 'destructive' : 'outline'} 
                                  className="text-xs"
                                >
                                  {guest.guestAge} anos
                                  {guest.isMinor && ' ⚠️ MENOR'}
                                </Badge>
                              </div>
                              {guest.parentName && (
                                <p className="text-xs text-muted-foreground ml-4">
                                  Responsável: {guest.parentName}
                                </p>
                              )}
                            </div>
                            {guest.attended && guest.checkedAt && (
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                {format(new Date(guest.checkedAt), 'HH:mm')}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  )}
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </ScrollArea>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={stats.pendingChanges === 0 || isSaving}
            className="gap-2 flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Presenças {stats.pendingChanges > 0 && `(${stats.pendingChanges})`}
              </>
            )}
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            disabled={isLoading || students.length === 0}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button
            onClick={exportAttendanceList}
            variant="outline"
            disabled={isLoading || students.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
