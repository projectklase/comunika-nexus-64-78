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
import { Download, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { format } from 'date-fns';

interface EventInvitation {
  id: string;
  friend_name: string;
  parent_name: string;
  parent_contact: string;
  created_at: string;
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
      setInvitations(data || []);
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

  const exportToCSV = () => {
    const csvData = invitations.map((inv) => ({
      'Nome do Amigo': inv.friend_name,
      'Nome do Responsável': inv.parent_name,
      'Contato do Responsável': inv.parent_contact,
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
      description: `${invitations.length} leads exportados.`,
    });
  };

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
            Convites Recebidos ({invitations.length})
          </CardTitle>
          {invitations.length > 0 && (
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum convite recebido ainda.</p>
            <p className="text-sm mt-2">
              Os alunos poderão convidar amigos quando a opção estiver habilitada.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Amigo</TableHead>
                  <TableHead>Nome do Responsável</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Data do Convite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.friend_name}</TableCell>
                    <TableCell>{inv.parent_name}</TableCell>
                    <TableCell>{inv.parent_contact}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(inv.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
