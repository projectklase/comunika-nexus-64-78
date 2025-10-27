import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Download, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { format } from 'date-fns';

interface EventInvitation {
  id: string;
  friend_name: string;
  friend_contact: string;
  parent_name: string | null;
  parent_contact: string | null;
  created_at: string;
  inviting_student_id: string;
  inviting_student?: {
    id: string;
    name: string;
  };
}

interface InvitationsByStudent {
  studentId: string;
  studentName: string;
  invitations: EventInvitation[];
}

interface EventInvitationsTabProps {
  eventId: string;
  eventTitle: string;
}

export function EventInvitationsTab({ eventId, eventTitle }: EventInvitationsTabProps) {
  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, [eventId]);

  const loadInvitations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('event_invitations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar dados dos alunos convidantes separadamente
      if (data && data.length > 0) {
        const studentIds = [...new Set(data.map(inv => inv.inviting_student_id))];
        const { data: students } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', studentIds);

        // Mapear dados dos alunos para os convites
        const invitationsWithStudents = data.map(inv => ({
          ...inv,
          inviting_student: students?.find(s => s.id === inv.inviting_student_id)
        }));

        setInvitations(invitationsWithStudents as EventInvitation[]);
      } else {
        setInvitations([]);
      }
    } catch (error: any) {
      console.error('Erro ao carregar convites:', error);
      toast({
        title: 'Erro ao carregar convites',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const groupInvitationsByStudent = (): InvitationsByStudent[] => {
    const grouped = invitations.reduce((acc, inv) => {
      const studentId = inv.inviting_student_id;
      
      if (!acc[studentId]) {
        acc[studentId] = {
          studentId,
          studentName: inv.inviting_student?.name || 'Aluno Desconhecido',
          invitations: []
        };
      }
      
      acc[studentId].invitations.push(inv);
      return acc;
    }, {} as Record<string, InvitationsByStudent>);
    
    return Object.values(grouped).sort((a, b) => 
      a.studentName.localeCompare(b.studentName)
    );
  };

  const exportToCSV = () => {
    const csvData = invitations.map((inv) => ({
      'Aluno Convidante': inv.inviting_student?.name || 'Desconhecido',
      'Nome do Amigo': inv.friend_name,
      'Telefone do Amigo': inv.friend_contact,
      'Nome do Responsável': inv.parent_name || 'N/A',
      'Contato do Responsável': inv.parent_contact || 'N/A',
      'Data do Convite': format(new Date(inv.created_at), 'dd/MM/yyyy HH:mm'),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${eventTitle.replace(/\s+/g, '_')}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV exportado com sucesso!',
      description: `${invitations.length} ${invitations.length === 1 ? 'convite exportado' : 'convites exportados'}.`,
    });
  };

  const groupedInvitations = groupInvitationsByStudent();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Convites de Amigos - {eventTitle}
          </CardTitle>
          {invitations.length > 0 && (
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
        {invitations.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Total de {invitations.length} {invitations.length === 1 ? 'convite' : 'convites'} de{' '}
            {groupedInvitations.length} {groupedInvitations.length === 1 ? 'aluno' : 'alunos'}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum convite recebido ainda.</p>
            <p className="text-sm mt-2">
              Os alunos poderão convidar amigos quando a opção estiver habilitada no evento.
            </p>
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {groupedInvitations.map((group) => (
              <AccordionItem 
                key={group.studentId} 
                value={group.studentId}
                className="border rounded-lg"
              >
                <AccordionTrigger className="hover:bg-muted/50 px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-purple-500/20">
                        <Users className="h-4 w-4 text-purple-400" />
                      </div>
                      <span className="font-semibold text-left">{group.studentName}</span>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {group.invitations.length} {group.invitations.length === 1 ? 'convite' : 'convites'}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pt-2 pb-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome do Amigo</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Responsável</TableHead>
                          <TableHead>Contato Resp.</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.invitations.map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium">
                              {inv.friend_name}
                            </TableCell>
                            <TableCell>
                              {inv.friend_contact}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {inv.parent_name || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {inv.parent_contact || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(inv.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
