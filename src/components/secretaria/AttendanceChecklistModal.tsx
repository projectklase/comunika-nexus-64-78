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
import { Search, Users, Download, Save, CheckSquare, Square, AlertCircle, Clock } from 'lucide-react';
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
    const csvData: any[] = [];
    
    // Cabeçalho com info do evento
    csvData.push({
      'Evento': eventTitle,
      'Data de Exportação': format(new Date(), 'dd/MM/yyyy HH:mm'),
      'Total de Pessoas': stats.totalStudents + stats.totalGuests,
      'Total Presentes': stats.totalPresent,
    });
    
    csvData.push({}); // Linha em branco
    
    // Dados dos alunos e convidados
    for (const student of students) {
      csvData.push({
        'Tipo': 'ALUNO',
        'Nome': student.studentName,
        'Idade': '-',
        'Responsável': student.guests.length > 0 ? `${student.guests.length} convidado(s)` : '-',
        'Presente': student.studentAttended ? 'SIM' : 'NÃO',
        'Horário': student.checkedAt ? format(new Date(student.checkedAt), 'HH:mm') : '-',
      });
      
      for (const guest of student.guests) {
        csvData.push({
          'Tipo': 'CONVIDADO',
          'Nome': `  └─ ${guest.guestName}`,
          'Idade': `${guest.guestAge} anos${guest.isMinor ? ' ⚠️ MENOR' : ''}`,
          'Responsável': guest.parentName || '-',
          'Presente': guest.attended ? 'SIM' : 'NÃO',
          'Horário': guest.checkedAt ? format(new Date(guest.checkedAt), 'HH:mm') : '-',
        });
      }
    }
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `lista_chamada_${eventTitle.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: '📥 Lista exportada!',
      description: `${csvData.length - 2} registros exportados`,
    });
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
            <Save className="h-4 w-4" />
            {isSaving ? 'Salvando...' : `Salvar Presenças ${stats.pendingChanges > 0 ? `(${stats.pendingChanges})` : ''}`}
          </Button>
          <Button
            onClick={exportAttendanceList}
            variant="outline"
            disabled={students.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Lista
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
