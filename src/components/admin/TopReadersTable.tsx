import { TopReader } from '@/types/post-read-analytics';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Trophy } from 'lucide-react';

interface TopReadersTableProps {
  readers: TopReader[];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TopReadersTable({ readers }: TopReadersTableProps) {
  if (!readers || readers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top 10 Alunos Mais Engajados
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhum aluno com leituras registradas
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Top 10 Alunos Mais Engajados
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Posição</TableHead>
            <TableHead>Aluno</TableHead>
            <TableHead>Turma</TableHead>
            <TableHead className="text-center">
              <div className="flex items-center justify-center gap-1">
                <BookOpen className="h-4 w-4" />
                Total de Leituras
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {readers.map((reader, index) => (
            <TableRow key={reader.student_id}>
              <TableCell className="font-bold text-center w-16">
                {index === 0 && <span className="text-yellow-500 text-xl">🥇</span>}
                {index === 1 && <span className="text-gray-400 text-xl">🥈</span>}
                {index === 2 && <span className="text-amber-600 text-xl">🥉</span>}
                {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(reader.student_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{reader.student_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {reader.class_name || 'Sem turma'}
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="font-semibold">
                  {reader.total_reads} leituras
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
