import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSchool } from '@/contexts/SchoolContext';

export type AttendanceStatus = 'PRESENTE' | 'FALTA' | 'JUSTIFICADA';

export interface AttendanceRecord {
  id?: string;
  class_id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  recorded_by?: string;
  student_name?: string;
}

export interface AttendanceAnalytics {
  total_records: number;
  total_present: number;
  total_absent: number;
  total_justified: number;
  absence_rate: number;
  attendance_rate: number;
  students_with_high_absence: Array<{
    student_id: string;
    student_name: string;
    class_name: string;
    absence_count: number;
    absence_percentage: number;
  }>;
  classes_with_low_attendance: Array<{
    class_id: string;
    class_name: string;
    total_records: number;
    present_count: number;
    attendance_rate: number;
  }>;
  daily_trend: Array<{
    date: string;
    present: number;
    absent: number;
    justified: number;
  }>;
}

export function useAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { currentSchool } = useSchool();

  // Carregar chamada de uma turma em uma data específica
  const loadAttendance = useCallback(async (
    classId: string, 
    date: string
  ): Promise<AttendanceRecord[]> => {
    if (!classId || !date) return [];

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('class_attendance')
        .select(`
          id,
          class_id,
          student_id,
          date,
          status,
          notes,
          recorded_by
        `)
        .eq('class_id', classId)
        .eq('date', date);

      if (error) throw error;

      return (data || []).map(record => ({
        ...record,
        status: record.status as AttendanceStatus
      }));
    } catch (error) {
      console.error('[useAttendance] Error loading attendance:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar chamada",
        description: "Não foi possível carregar os registros de presença."
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Salvar/atualizar registros de presença
  const saveAttendance = useCallback(async (
    records: Omit<AttendanceRecord, 'id'>[]
  ): Promise<boolean> => {
    if (records.length === 0) return false;

    try {
      setIsSaving(true);

      // Upsert para cada registro (unique constraint em class_id, student_id, date)
      const { error } = await supabase
        .from('class_attendance')
        .upsert(
          records.map(record => ({
            class_id: record.class_id,
            student_id: record.student_id,
            date: record.date,
            status: record.status,
            notes: record.notes || null,
            recorded_by: record.recorded_by,
            updated_at: new Date().toISOString()
          })),
          { onConflict: 'class_id,student_id,date' }
        );

      if (error) throw error;

      toast({
        title: "Chamada salva",
        description: `${records.length} registro(s) de presença salvo(s) com sucesso.`
      });

      return true;
    } catch (error) {
      console.error('[useAttendance] Error saving attendance:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar chamada",
        description: "Não foi possível salvar os registros de presença."
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Buscar histórico de presença de um aluno
  const getStudentAttendanceHistory = useCallback(async (
    studentId: string,
    daysBack: number = 30
  ): Promise<AttendanceRecord[]> => {
    if (!studentId) return [];

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('class_attendance')
        .select('*')
        .eq('student_id', studentId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      return (data || []).map(record => ({
        ...record,
        status: record.status as AttendanceStatus
      }));
    } catch (error) {
      console.error('[useAttendance] Error fetching student history:', error);
      return [];
    }
  }, []);

  // Buscar analytics de presença via RPC
  const getAttendanceAnalytics = useCallback(async (
    daysFilter: number = 30
  ): Promise<AttendanceAnalytics | null> => {
    if (!currentSchool?.id) return null;

    try {
      const { data, error } = await supabase.rpc('get_attendance_analytics', {
        days_filter: daysFilter,
        school_id_param: currentSchool.id
      });

      if (error) throw error;

      return data as unknown as AttendanceAnalytics;
    } catch (error) {
      console.error('[useAttendance] Error fetching analytics:', error);
      return null;
    }
  }, [currentSchool?.id]);

  // Estatísticas rápidas de uma turma
  const getClassAttendanceStats = useCallback(async (
    classId: string,
    daysBack: number = 30
  ): Promise<{
    totalDays: number;
    avgAttendanceRate: number;
    totalAbsences: number;
  }> => {
    if (!classId) {
      return { totalDays: 0, avgAttendanceRate: 0, totalAbsences: 0 };
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('class_attendance')
        .select('date, status')
        .eq('class_id', classId)
        .gte('date', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      const records = data || [];
      const uniqueDates = new Set(records.map(r => r.date)).size;
      const presentCount = records.filter(r => r.status === 'PRESENTE').length;
      const absentCount = records.filter(r => r.status === 'FALTA').length;
      const totalRecords = records.length;

      return {
        totalDays: uniqueDates,
        avgAttendanceRate: totalRecords > 0 
          ? Math.round((presentCount / totalRecords) * 100) 
          : 0,
        totalAbsences: absentCount
      };
    } catch (error) {
      console.error('[useAttendance] Error fetching class stats:', error);
      return { totalDays: 0, avgAttendanceRate: 0, totalAbsences: 0 };
    }
  }, []);

  return {
    isLoading,
    isSaving,
    loadAttendance,
    saveAttendance,
    getStudentAttendanceHistory,
    getAttendanceAnalytics,
    getClassAttendanceStats
  };
}
