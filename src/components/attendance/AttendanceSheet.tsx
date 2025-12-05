import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAttendance, AttendanceRecord, AttendanceStatus } from '@/hooks/useAttendance';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CalendarIcon, 
  Check, 
  X, 
  AlertCircle, 
  Save,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

interface AttendanceSheetProps {
  classId: string;
  students: Student[];
}

type LocalAttendance = {
  studentId: string;
  status: AttendanceStatus;
  notes?: string;
};

export function AttendanceSheet({ classId, students }: AttendanceSheetProps) {
  const { user } = useAuth();
  const { loadAttendance, saveAttendance, isLoading: loading } = useAttendance();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [localAttendance, setLocalAttendance] = useState<LocalAttendance[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Carregar chamada da data selecionada
  useEffect(() => {
    const fetchAttendance = async () => {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const records = await loadAttendance(classId, dateStr);
      
      // Inicializar com dados existentes ou vazio
      const initial: LocalAttendance[] = students.map(student => {
        const existing = records.find(r => r.student_id === student.id);
        return {
          studentId: student.id,
          status: existing?.status || 'PRESENTE',
          notes: existing?.notes || ''
        };
      });
      
      setLocalAttendance(initial);
      setHasChanges(false);
      setInitialLoaded(true);
    };

    fetchAttendance();
  }, [classId, selectedDate, students]);

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setLocalAttendance(prev => 
      prev.map(item => 
        item.studentId === studentId ? { ...item, status } : item
      )
    );
    setHasChanges(true);
  };

  const updateNotes = (studentId: string, notes: string) => {
    setLocalAttendance(prev => 
      prev.map(item => 
        item.studentId === studentId ? { ...item, notes } : item
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const records: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at' | 'school_id'>[] = 
        localAttendance.map(item => ({
          class_id: classId,
          student_id: item.studentId,
          date: dateStr,
          status: item.status,
          notes: item.notes || null,
          recorded_by: user.id
        }));

      await saveAttendance(records);
      setHasChanges(false);
      toast.success('Chamada salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar chamada:', error);
      toast.error('Erro ao salvar chamada');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    setLocalAttendance(prev => prev.map(item => ({ ...item, status: 'PRESENTE' })));
    setHasChanges(true);
  };

  const markAllAbsent = () => {
    setLocalAttendance(prev => prev.map(item => ({ ...item, status: 'FALTA' })));
    setHasChanges(true);
  };

  // Estatísticas
  const stats = {
    total: localAttendance.length,
    presentes: localAttendance.filter(a => a.status === 'PRESENTE').length,
    faltas: localAttendance.filter(a => a.status === 'FALTA').length,
    justificadas: localAttendance.filter(a => a.status === 'JUSTIFICADA').length
  };

  const getStatusButton = (studentId: string, status: AttendanceStatus, current: AttendanceStatus) => {
    const isActive = current === status;
    
    const configs: Record<AttendanceStatus, { icon: typeof Check; label: string; activeClass: string }> = {
      'PRESENTE': { 
        icon: Check, 
        label: 'P', 
        activeClass: 'bg-green-500 hover:bg-green-600 text-white border-green-500' 
      },
      'FALTA': { 
        icon: X, 
        label: 'F', 
        activeClass: 'bg-red-500 hover:bg-red-600 text-white border-red-500' 
      },
      'JUSTIFICADA': { 
        icon: AlertCircle, 
        label: 'J', 
        activeClass: 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500' 
      }
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'w-10 h-10 p-0 transition-all',
          isActive && config.activeClass
        )}
        onClick={() => updateStatus(studentId, status)}
      >
        <Icon className="h-4 w-4" />
      </Button>
    );
  };

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum aluno matriculado nesta turma
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com data e ações */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={ptBR}
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Todos Presentes
          </Button>
          <Button variant="outline" size="sm" onClick={markAllAbsent}>
            <XCircle className="h-4 w-4 mr-2" />
            Todos Ausentes
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="min-w-[120px]"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.presentes}</p>
            <p className="text-sm text-muted-foreground">Presentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.faltas}</p>
            <p className="text-sm text-muted-foreground">Faltas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.justificadas}</p>
            <p className="text-sm text-muted-foreground">Justificadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de alunos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Chamada
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !initialLoaded ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((student, index) => {
                const attendance = localAttendance.find(a => a.studentId === student.id);
                
                return (
                  <div
                    key={student.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg',
                      index % 2 === 0 ? 'bg-muted/30' : ''
                    )}
                  >
                    <span className="w-8 text-muted-foreground font-mono">
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{student.name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusButton(student.id, 'PRESENTE', attendance?.status || 'PRESENTE')}
                      {getStatusButton(student.id, 'FALTA', attendance?.status || 'PRESENTE')}
                      {getStatusButton(student.id, 'JUSTIFICADA', attendance?.status || 'PRESENTE')}
                    </div>

                    <Input
                      placeholder="Observação..."
                      value={attendance?.notes || ''}
                      onChange={(e) => updateNotes(student.id, e.target.value)}
                      className="w-40 hidden sm:block"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center">
            <Check className="h-4 w-4 text-white" />
          </div>
          <span>Presente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-red-500 flex items-center justify-center">
            <X className="h-4 w-4 text-white" />
          </div>
          <span>Falta</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-yellow-500 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-white" />
          </div>
          <span>Justificada</span>
        </div>
      </div>
    </div>
  );
}
