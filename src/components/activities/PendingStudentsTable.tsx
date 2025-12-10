import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  UserX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Delivery } from '@/types/delivery';

interface StudentInfo {
  id: string;
  name: string;
}

interface PendingStudentsTableProps {
  classStudents: StudentInfo[];
  deliveries: Delivery[];
  dueAt?: string;
  onMarkAsReceived: (studentId: string, studentName: string) => void;
  isLoading?: boolean;
}

export function PendingStudentsTable({ 
  classStudents, 
  deliveries, 
  dueAt,
  onMarkAsReceived,
  isLoading = false
}: PendingStudentsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'late' | 'pending'>('all');

  // Get students who haven't delivered
  const pendingStudents = useMemo(() => {
    const deliveredStudentIds = new Set(deliveries.map(d => d.studentId));
    const now = new Date();
    const dueDate = dueAt ? new Date(dueAt) : null;
    const isOverdue = dueDate ? now > dueDate : false;

    return classStudents
      .filter(student => !deliveredStudentIds.has(student.id))
      .map(student => ({
        ...student,
        isLate: isOverdue
      }));
  }, [classStudents, deliveries, dueAt]);

  // Filtered list
  const filteredStudents = useMemo(() => {
    return pendingStudents.filter(student => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!student.name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filterStatus === 'late' && !student.isLate) {
        return false;
      }
      if (filterStatus === 'pending' && student.isLate) {
        return false;
      }

      return true;
    });
  }, [pendingStudents, searchQuery, filterStatus]);

  const lateCount = pendingStudents.filter(s => s.isLate).length;
  const pendingCount = pendingStudents.filter(s => !s.isLate).length;

  if (pendingStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle className="h-12 w-12 text-success mb-4" />
        <h3 className="text-lg font-medium mb-2">Todos os alunos entregaram!</h3>
        <p className="text-muted-foreground">
          Não há alunos pendentes para esta atividade.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "bg-muted/50 backdrop-blur-sm border",
            filterStatus === 'all' 
              ? "border-primary/50 bg-primary/10 text-primary" 
              : "border-border/50 hover:border-border"
          )}
        >
          <UserX className="h-3.5 w-3.5" />
          Todos ({pendingStudents.length})
        </button>
        
        {lateCount > 0 && (
          <button
            onClick={() => setFilterStatus('late')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "bg-destructive/10 backdrop-blur-sm border",
              filterStatus === 'late' 
                ? "border-destructive/50 text-destructive" 
                : "border-destructive/30 text-destructive/70 hover:text-destructive"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Atrasados ({lateCount})
          </button>
        )}
        
        {pendingCount > 0 && (
          <button
            onClick={() => setFilterStatus('pending')}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              "bg-primary/10 backdrop-blur-sm border",
              filterStatus === 'pending' 
                ? "border-primary/50 text-primary" 
                : "border-primary/30 text-primary/70 hover:text-primary"
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            No prazo ({pendingCount})
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por aluno..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Aluno</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum aluno encontrado com os filtros aplicados
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="font-medium">{student.name}</div>
                  </TableCell>
                  <TableCell>
                    {student.isLate ? (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Atrasado
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMarkAsReceived(student.id, student.name)}
                      disabled={isLoading}
                      className="bg-success/10 border-success/30 text-success hover:bg-success/20 hover:border-success/50"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Marcar Recebida</span>
                      <span className="sm:hidden">Recebida</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
